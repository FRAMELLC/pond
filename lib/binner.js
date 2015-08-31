"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _underscore = require("underscore");

var _underscore2 = _interopRequireDefault(_underscore);

var _generator = require("./generator");

var _generator2 = _interopRequireDefault(_generator);

var _range = require("./range");

var _range2 = _interopRequireDefault(_range);

var _event = require("./event");

/**
 * Bins a stream of events to a new stream of events with a fixed
 * frequency.
 */

var Binner = (function () {
    function Binner(size, processor, observer) {
        _classCallCheck(this, Binner);

        this._generator = new _generator2["default"](size);
        this._processor = processor;
        this._bucket = null;
        this._observer = observer;
        this._activeBucketList = {};
    }

    _createClass(Binner, [{
        key: "incrementActiveBucketList",

        /**
         * Gets the current bucket or returns a new one.
         *
         * If a new bucket is generated the result of the old bucket is emitted
         * automatically.
         */
        value: function incrementActiveBucketList(timestamp) {
            var _this = this;

            var bucketList = [];
            if (!this._lastTime) {
                bucketList = [];
            } else {
                bucketList = this._generator.bucketList(this._lastTime, timestamp);
            }
            _underscore2["default"].each(bucketList, function (b) {
                if (!_underscore2["default"].has(_this._activeBucketList, b.index().asString())) {
                    _this._activeBucketList[b.index().asString()] = b;
                }
            });
            return bucketList;
        }
    }, {
        key: "getEdgeValues",

        /**
         *   |-range -----------|
         *         |-bucket------------|
         *         |            x      |  - v2
         *         |                   |
         *         o                   |  - va
         *   x     |                   |  - v1
         *         |-intersect--|      |
         */
        value: function getEdgeValues(range, v1, v2, intersection) {
            var tr = range.duration();
            var ta = intersection.begin().getTime();
            var tb = intersection.end().getTime();
            var t1 = range.begin().getTime();
            return { va: v1 + (ta - t1) / tr * (v2 - v1),
                vb: v1 + (tb - t1) / tr * (v2 - v1) };
        }
    }, {
        key: "addEvent",

        /**
         * Add an event, which will be assigned to a bucket
         */
        value: function addEvent(event, cb) {
            var _this2 = this;

            var time = event.timestamp();
            var value = event.get();

            this.incrementActiveBucketList(time);

            // Process the active bundle list
            _underscore2["default"].each(this._activeBucketList, function (bucket) {
                console.log("Buckets:", bucket.name(), bucket.timerange().toString());
                var bucketTimeRange = bucket.index().asTimerange();
                var pointsTimeRange = new _range2["default"](_this2._lastTime, time);
                var intersection = pointsTimeRange.intersection(bucketTimeRange);
                if (intersection && intersection.begin().getTime() === bucketTimeRange.begin().getTime()) {
                    var _getEdgeValues = _this2.getEdgeValues(pointsTimeRange, _this2._lastValue, value, intersection);

                    var va = _getEdgeValues.va;
                    var vb = _getEdgeValues.vb;

                    bucket.addEvent(new _event.Event(bucketTimeRange.begin(), va));
                    bucket.addEvent(new _event.Event(bucketTimeRange.end(), vb));
                }
            });

            //Flush buckets
            var deleteList = [];
            _underscore2["default"].each(this._activeBucketList, function (bucket, key) {
                if (bucket.end() < time) {
                    bucket.aggregate(_this2._processor, function (event) {
                        if (!_underscore2["default"].isUndefined(event) && _this2._observer) {
                            console.log(">>> Emit event", event, _this2._observer);
                            _this2._observer(event);
                        }
                        deleteList.push(key);
                    });
                }
            });
            _underscore2["default"].each(deleteList, function (key) {
                return delete _this2._activeBucketList[key];
            });

            this._lastTime = time;
            this._lastValue = value;
        }
    }, {
        key: "flush",

        /**
         * Forces the current buckets to emit
         */
        value: function flush() {
            var _this3 = this;

            _underscore2["default"].each(this._activeBucketList, function (bucket, i) {
                bucket.aggregate(_this3._processor, function (event) {
                    if (event) {
                        _this3._observer && _this3._observer(event);
                    }
                });
            });
            this._activeBucketList = {};
        }
    }, {
        key: "onEmit",

        /**
         * Set the emit callback after the constructor
         */
        value: function onEmit(cb) {
            this._observer = cb;
        }
    }]);

    return Binner;
})();

exports["default"] = Binner;
module.exports = exports["default"];