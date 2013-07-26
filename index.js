/**
 * Module dependencies.
 */
var EventEmitter = require("events").EventEmitter
  , uuid = require("uuid");

/**
 * Expose `quevent`.
 * @type Function
 */
module.exports = quevent;

/**
 * Monkey-patch the `events.EventEmitter`.
 * @param  {events.EventEmitter} emitter
 * @param  {String}              event   optional
 * @return {events.EventEmitter|Function}
 */
function quevent(emitter, event) {
  patch(emitter);

  if(event) // TODO: Maybe single mode
    emitter.quevent.queue(event);

  return emitter;
}

/**
 * If not already patched, patch `emitter`.
 * @param  {events.EventEmitter} emitter
 */
function patch(emitter) {
  if(emitter.quevent) return;

  emitter.quevent = {
      addListener: addListener.bind(emitter)
    , _addListener: emitter.addListener.bind(emitter)
    , emit: emit.bind(emitter)
    , _emit: emitter.emit.bind(emitter)
    , queue: queue.bind(emitter)
    , dequeue: dequeue.bind(emitter)
    , queueing: queueing.bind(emitter)
    , _queueing: []
    , _cache: {}
    };

  emitter.on = emitter.addListener = emitter.quevent.addListener;
  emitter.emit = emitter.quevent.emit;
}

/**
 * Patched `addListener`.
 * @param {String}   event
 * @param {Function} listener
 * @param {Boolean}  queue    optional
 * @return {events.EventEmitter}
 */
function addListener(event, listener, queue) {
  if(queue === false || !this.quevent.queueing(event))
    return this.quevent._addListener(event, listener);

  this.quevent.queue(event);
  return this.quevent._addListener("quevent:" + event, listener);
}

/**
 * Patched `emit`.
 * @param  {String} event
 * @return {events.EventEmitter}
 */
function emit(event) {
  arguments = Array.prototype.slice.call(arguments, 0);

  if(!this.quevent.queueing(event)) {
    this.quevent._emit.apply(this, arguments);
    arguments[0] = "quevent:" + event;
    this.quevent._emit.apply(this, arguments);
    return this;
  }

  var cache = this.quevent._cache[uuid.v4()] = {
        arguments: arguments
      , working: this.listeners(event).length
      };
  arguments.push(done.bind(this, cache));
  this.quevent._emit.apply(this, arguments);

  return this;
}

/**
 * Called when a vip listener is done.
 * @param  {Object} cache
 */
function done(cache) {
  if(0 === --cache.working) {
    cache.arguments[0] = "quevent:" + cache.arguments[0];
    this.quevent._emit.apply(this, cache.arguments);
  }
}

/**
 * Start queueing an `event` and optionally put all current listeners in the queue.
 * @param  {String} event
 * @param  {Boolean} getInLine optional
 * @return {events.EventEmitter}
 */
function queue(event, getInLine) {
  if(getInLine === true) {
    this.listeners(event).forEach(function(listener) {
      this.on("quevent:" + event, listener);
    }, this);
    this.removeAllListeners(event);
  }

  if(!~this.quevent._queueing.indexOf(event))
    this.quevent._queueing.push(event);

  return this;
}

/**
 * Dequeue `event` and optionally emit it.
 * @param  {String|Array} event
 * @return {events.EventEmitter}
 */
function dequeue(event) {
  if(arguments.length > 1)
    this.quevent.emit.apply(this, arguments);

  if(event instanceof Array)
    event.forEach(remove, this.quevent._queueing);
  else if(typeof event === "string")
    remove.call(this.quevent._queueing, event);

  function remove(str) {
    var i;
    while((i = this.indexOf(str)) !== -1)
      this.splice(i, 1);
  }

  return this;
}

/**
 * Which events are queued.
 * @param  {String} event
 * @return {String|Array}
 */
function queueing(event) {
  if(event)
    return !!~this.quevent._queueing.indexOf(event);
  return this.quevent._queueing.slice(0);
}