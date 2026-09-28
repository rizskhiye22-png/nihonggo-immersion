// Worker tokenisasi bahasa Jepang (kuromoji). Berjalan di thread terpisah
// agar halaman tidak macet saat kamus ±12 MB dimuat dan saat teks dianalisis.
/* eslint-disable no-restricted-globals */
self.window = self; // kuromoji mengharapkan objek `window`
importScripts("/vendor/kuromoji.js");

var tokenizer = null;
var ready = new Promise(function (resolve, reject) {
  self.kuromoji.builder({ dicPath: "/dict/kuromoji/" }).build(function (err, t) {
    if (err) reject(err);
    else {
      tokenizer = t;
      resolve();
    }
  });
});

ready.then(
  function () { self.postMessage({ type: "ready" }); },
  function (err) { self.postMessage({ type: "fatal", error: String(err) }); }
);

self.onmessage = function (e) {
  var msg = e.data;
  ready.then(
    function () {
      var result = msg.texts.map(function (text) {
        return tokenizer.tokenize(text).map(function (x) {
          return { surface_form: x.surface_form, pos: x.pos, pos_detail_1: x.pos_detail_1, basic_form: x.basic_form, reading: x.reading };
        });
      });
      self.postMessage({ id: msg.id, result: result });
    },
    function (err) { self.postMessage({ id: msg.id, error: String(err) }); }
  );
};
