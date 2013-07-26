/**
 * Module dependencies.
 */
var EventEmitter = require("events").EventEmitter
  , quevent = require("./");

var emitter = quevent(new EventEmitter).quevent.queue("test");

emitter.on("test", function() {
  console.log("NO VIP #1", arguments);
});
emitter.on("test", function() {
  console.log("NO VIP #2", arguments);
});
emitter.on("test", function() {
  console.log("NO VIP #3", arguments);
});

emitter.on("test", function(done) {
  console.log("VIP #1", arguments);
  setTimeout(done, 500);
}, false);
emitter.on("test", function(done) {
  console.log("VIP #2", arguments);
  setTimeout(done, 400);
}, false);
emitter.on("test", function(done) {
  console.log("VIP #3", arguments);
  setTimeout(done, 300);
}, false);

emitter.emit("test", "arg1", "arg2", "arg3");