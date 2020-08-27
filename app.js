//モジュールのインポート
const https = require('https');
const fs = require('fs');
const request = require('request');
var Twitter = require('twitter');
var iconv = require('iconv-lite');
const express = require('express')
const credential = require('./credential.js');
const app = express();
const Firestore = require('@google-cloud/firestore');
const { rejects } = require('assert');

const db = new Firestore({
  projectId: credential.projectId,
  keyFilename: credential.keyFilename,
});

// ダウンロード先のURL
const url = 'https://matsuri.5ch.net/morningcoffee/subback.html';

const falseList = [
  /[Pp][Aa][Rr][Tt]\d*/,
  /鈴木/,
  /中日ドラゴンズ/,
  /一人で行く/,
  /佐々木希/,
  /応援スレ/,
  /チンクエッティ/,
  /太田/
]

const trueList = [
  /笠原/,
  /桃奈/,
  /[かカｶ][さサｻ][はハﾊ][らラﾗ]/,
  /[もモﾓ][もモﾓ][なナﾅ]/,
  /[Kk][Aa][Ss][Aa][Hh][Aa][Rr][Aa]/,
  /[かカｶ][っッｯ][さサｻ]/,
  /[かカｶ][みミﾐ][かカｶ][さサｻ]/,
  /竹内/,
  /朱莉/,
  /川村/,
  /文乃/,
  /佐々木/,
  /莉佳子/,
  /上國料/,
  /萌衣/,
  /船木/,
  /[むムﾑ][すスｽ][ぶブﾌﾞ]/,
  /太田/,
  /伊勢/,
  /鈴蘭/,
  /橋迫/,
  /[あアｱ][んンﾝ][じジｼﾞ][ゅュｭ][るルﾙ]*[むムﾑ]*/
]

const client = new Twitter({
  consumer_key: credential.keys.consumer_key,
  consumer_secret: credential.keys.consumer_secret,
  access_token_key: credential.keys.access_token_key,
  access_token_secret: credential.keys.access_token_secret
});

function tweet(x) {
  const docRef = db.collection('5ch-thread');
  docRef.doc(x.id).get().then(doc => {
    if(!doc.exists) {
      docRef.doc(x.id).set({"url": x.url})
      var tweet_text = x.title + '\n' + x.url;
      client.post('statuses/update', {status: tweet_text}, function(error, tweet, response) {
        if (!error) {
          console.log(new Date() + ' tweet success: ' + tweet_text)
        } else {
          console.log(error);
        }
      });
    } else {
      console.log('Already tweeted');
    }
  })
}

function checkAngerme (x) {
  // Exception Area
  for(var fl of falseList) {
    if(fl.test(x)) return false;
  }
  for(var tl of trueList) {
    if(tl.test(x)) return true;
  }
  // If x includes momona, this sentence have momona topic even if other members name is there.
  return false;
}

function parse(x) {
  var l = [];
  var list = x.replace(/\n/g, '').split('<a');
  for(var item of list){
    // Skip non thread title.
    if(/^.*href="\d+.*$/.test(item)) {
      var unit = {};
      unit.id = item.replace(/^.*href="([^\/]+)\/.*$/, '$1');
      unit.url = 'https://matsuri.5ch.net/test/read.cgi/morningcoffee/' + unit.id;
      unit.title = item.replace(/^.*>([^>]+)<\/a>.*$/, '$1').replace(/&quot;/g, '').replace(/^\d+: /, '').replace(/\(\d+\)$/, '');
      if(checkAngerme(unit.title)) {
        l.push(unit);
      }
    }
  };
  return l;
}

function run(url, callback) {
  request(url).on('error', (err) => { reject(err) })
              .pipe(iconv.decodeStream("windows-31j"))
              .collect((err, body) => {
                if(err) return callback(err);
                var list = parse(body);
                for(l of list){
                  tweet(l);
                }
                return callback();
              });
}

app.get('/', async (req, res) => {
  await run(url, function(err){
    if(err) {
      res.status(400).send('Failed').end();
    } else {
      res.status(200).send('Success').end();
    }
  })
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;