/*
    JavaScript autoComplete v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/JavaScript-autoComplete
    License: http://www.opensource.org/licenses/mit-license.php
*/

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./utils/localStorage'), require('./utils/cache'), require('./utils/dom'));
    } else {
        root.autoComplete = factory(
            root['autoComplete/utils/localStorage'],
            root['autoComplete/utils/cache'],
            root['autoComplete/utils/dom']
        );
    }
}(typeof self !== 'undefined' ? self : this, function (_localStorage, _cache, _dom) {
    // "use strict";

    var removeQueryFromLocalStorage = _localStorage.removeQueryFromLocalStorage,
        addQueryToLocalStorage = _localStorage.addQueryToLocalStorage,
        getQueriesFromLocalStorage = _localStorage.getQueriesFromLocalStorage,
        removeDuplicatedQueries = _localStorage.removeDuplicatedQueries;

    var removeSuggestionFromCache = _cache.removeSuggestionFromCache;
    var getClosest = _dom.getClosest;

    var requestId = 0;

    var POSITION_RELATIVE_VALUES = ['absolute', 'fixed', 'relative'];
    function getPositionStyle(element) {
        return element ? window.getComputedStyle(element).position : null;
    }

    function getParentPositionDeterminant(element) {
        var parent = element.parentNode;
        return (
            POSITION_RELATIVE_VALUES.indexOf(getPositionStyle(parent)) > -1
            && parent
        ) || getParentPositionDeterminant(parent);
    }

    function autoComplete(options) {
        if (!document.querySelector) return;

        // helpers
        function hasClass(el, className) { return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className); }

        function addEvent(el, type, handler) {
            if (el.attachEvent) el.attachEvent('on' + type, handler); else el.addEventListener(type, handler);
        }
        function removeEvent(el, type, handler) {
            // if (el.removeEventListener) not working in IE11
            if (el.detachEvent) el.detachEvent('on' + type, handler); else el.removeEventListener(type, handler);
        }
        function live(elClass, event, cb, context) {
            addEvent(context || document, event, function (e) {
                var found, el = e.target || e.srcElement;
                while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
                if (found) cb.call(el, e);
            });
        }

        var o = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            cache: 1,
            menuClass: '',
            renderItem: function (item, search, suggestionIndex) {
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return '<div class="autocomplete-suggestion" data-val="' + item + '" data-index="' + suggestionIndex + '">' + item.replace(re, "<span>$1</span>") + '</div>';
            },
            onSelect: function (e, term, item) { },
            queryHistoryStorageName: null,
            formSelector: null,
            localSize: 5,
            buildTerm: function (term) { return term },
            target: null
        };
        for (var k in options) { if (options.hasOwnProperty(k)) o[k] = options[k]; }

        // init
        var elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
        for (var i = 0; i < elems.length; i++) {
            var that = elems[i];
            var rawData;

            // create suggestions container "sc"
            that.parentPositionDeterminant = getParentPositionDeterminant(that);
            that.sc = document.createElement('div');
            that.sc.className = 'autocomplete-suggestions ' + o.menuClass;

            that.autocompleteAttr = that.getAttribute('autocomplete');
            that.setAttribute('autocomplete', 'off');
            that.cache = {};
            that.last_val = '';
            that._currentRequestId = 0;

            that.updateSC = function (resize, next) {
                var rect = that.getBoundingClientRect();

                that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth

                var thatLeft = rect.left + (window.pageXOffset || document.documentElement.scrollLeft);
                var thatBottom = rect.bottom + (window.pageYOffset || document.documentElement.scrollTop);
                var parentTop = 0;
                var parentLeft = 0;
                if (that.parentPositionDeterminant) {
                    var parentRect = that.parentPositionDeterminant.getBoundingClientRect();
                    parentLeft = parentRect.left + (window.pageXOffset || document.documentElement.scrollLeft);
                    parentTop = parentRect.top + (window.pageYOffset || document.documentElement.scrollTop);
                }
                that.sc.style.left = Math.round(thatLeft - parentLeft + o.offsetLeft) + 'px';
                that.sc.style.top = Math.round(thatBottom - parentTop + o.offsetTop) + 'px';

                if (!resize) {
                    that.sc.style.display = 'block';
                    if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
                    if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight;
                    if (that.sc.suggestionHeight)
                        if (!next) that.sc.scrollTop = 0;
                        else {
                            var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
                            if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
                                that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
                            else if (selTop < 0)
                                that.sc.scrollTop = selTop + scrTop;
                        }
                }
            }
            if (!that.parentPositionDeterminant) {
                addEvent(window, 'resize', that.updateSC);
            }
            that.parentElement.appendChild(that.sc);

            live('autocomplete-suggestion', 'mouseleave', function (e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) setTimeout(function () { sel.className = sel.className.replace('selected', ''); }, 20);
            }, that.sc);

            live('autocomplete-suggestion', 'mouseover', function (e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) sel.className = sel.className.replace('selected', '');
                this.className += ' selected';
            }, that.sc);

            live('autocomplete-suggestion', 'mousedown', function (e) {
                if (getClosest(e.target, '.autocomplete-suggestion') && !getClosest(e.target, '.autocomplete-suggestion--local-remove-button')) { // else outside click
                    var v = this.getAttribute('data-val');
                    var index = this.getAttribute('data-index');
                    if (o.queryHistoryStorageName) {
                        addQueryToLocalStorage(o.queryHistoryStorageName, rawData[index], o.localSize);
                    }
                    that.value = v;
                    o.onSelect(e, v, this);
                    that.sc.style.display = 'none';
                }
            }, that.sc);

            live('autocomplete-suggestion--local-remove-button', 'mousedown', function (e) {
                var index = this.parentElement.getAttribute('data-index');
                this.parentElement.parentElement.removeChild(this.parentElement);
                that.cache = removeSuggestionFromCache(that.cache, rawData[index]);
                removeQueryFromLocalStorage(o.queryHistoryStorageName, rawData[index]);
            }, that.sc);

            that.blurHandler = function () {
                try { var over_sb = document.querySelector('.autocomplete-suggestions:hover'); } catch (e) { var over_sb = 0; }
                if (!over_sb) {
                    that.last_val = that.value;
                    that.sc.style.display = 'none';
                    setTimeout(function () { that.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
                } else if (that !== document.activeElement) setTimeout(function () { that.focus(); }, 20);
            };
            addEvent(that, 'blur', that.blurHandler);

            var suggest = function (data) {
                var val = that.value;
                if (o.queryHistoryStorageName) {
                    var localQueries = getQueriesFromLocalStorage(o.queryHistoryStorageName, o.buildTerm(val.toLowerCase()), o.target);
                    if (val.length >= o.minChars) {
                        data = localQueries.concat(data);
                        data = removeDuplicatedQueries(data);
                    } else {
                        data = localQueries;
                    }
                }
                rawData = data;
                that.cache[val] = data;
                if (data.length) {
                    var s = '';
                    for (var i = 0; i < data.length; i++) s += o.renderItem(data[i], val, i);
                    that.sc.innerHTML = s;
                    that.updateSC(0);
                }
                else
                    that.sc.style.display = 'none';
            }
            addEvent(that, 'click', function (e) {
                if (that.value.length >= o.minChars) {
                    o.source(that.value, suggest);
                } else {
                    suggest([]);
                }
            });

            if (document.querySelector(o.formSelector) && o.queryHistoryStorageName) {
                addEvent(document.querySelector(o.formSelector), 'submit', function (e) {
                    addQueryToLocalStorage(o.queryHistoryStorageName, o.buildTerm(that.value.toLocaleLowerCase()), o.localSize);
                });
            }

            that.keydownHandler = function (e) {

                var key = window.event ? e.keyCode : e.which;
                // down (40), up (38)
                if ((key == 40 || key == 38) && that.sc.innerHTML) {
                    var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (!sel) {
                        next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
                        next.className += ' selected';
                        that.value = next.getAttribute('data-val');
                    } else {
                        next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                        if (next) {
                            sel.className = sel.className.replace('selected', '');
                            next.className += ' selected';
                            that.value = next.getAttribute('data-val');
                        }
                        else { sel.className = sel.className.replace('selected', ''); that.value = that.last_val; next = 0; }
                    }
                    that.updateSC(0, next);
                    return false;
                }
                // esc
                else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; }
                // enter
                else if (key == 13 || key == 9) {
                    var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (sel && that.sc.style.display != 'none') {
                        if (o.queryHistoryStorageName) {
                            var index = sel.getAttribute('data-index');
                            addQueryToLocalStorage(o.queryHistoryStorageName, rawData[index], o.localSize);
                        }
                        o.onSelect(e, sel.getAttribute('data-val'), sel);
                        setTimeout(function () { that.sc.style.display = 'none'; }, 20);
                    }
                }
            };
            addEvent(that, 'keydown', that.keydownHandler);

            that.keyupHandler = function (e) {
                var key = window.event ? e.keyCode : e.which;
                if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                    var val = that.value;
                    if (val.length >= o.minChars) {
                        if (val != that.last_val) {
                            that.last_val = val;
                            clearTimeout(that.timer);
                            if (o.cache) {
                                if (val in that.cache) { suggest(that.cache[val]); return; }
                                // no requests if previous suggestions were empty
                                for (var i = 1; i < val.length - o.minChars; i++) {
                                    var part = val.slice(0, val.length - i);
                                    if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
                                }
                            }
                            that.timer = setTimeout(function () {
                                var thisRequestId = requestId++;
                                var suggestWrap = function (data) {
                                    // drop response of old requests
                                    if (thisRequestId < that._currentRequestId) {
                                        return;
                                    }
                                    that._currentRequestId = thisRequestId;
                                    return suggest(data);
                                }
                                o.source(val, suggestWrap);
                            }, o.delay);
                        }
                    } else {
                        that.last_val = val;
                        if (o.queryHistoryStorageName) {
                            suggest([]);
                        } else {
                            that.sc.style.display = 'none';
                        }
                    }
                }
            };
            addEvent(that, 'keyup', that.keyupHandler);

            that.focusHandler = function (e) {
                that.last_val = '\n';
                that.keyupHandler(e)
            };
            if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
        }

        // public destroy method
        this.destroy = function () {
            for (var i = 0; i < elems.length; i++) {
                var that = elems[i];
                removeEvent(window, 'resize', that.updateSC);
                removeEvent(that, 'blur', that.blurHandler);
                removeEvent(that, 'focus', that.focusHandler);
                removeEvent(that, 'keydown', that.keydownHandler);
                removeEvent(that, 'keyup', that.keyupHandler);
                if (that.autocompleteAttr)
                    that.setAttribute('autocomplete', that.autocompleteAttr);
                else
                    that.removeAttribute('autocomplete');
                that.parentElement.removeChild(that.sc);
                that = null;
            }
        };
    }
    return autoComplete;
}));
