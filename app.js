//モジュールのインポート
const https = require('https');
const fs = require('fs');
const iconv = require('iconv-lite')
const request = require('request');
var Twitter = require('twitter');
const express = require('express')
const credential = require('./credential.js');
const app = express();

// ダウンロード先のURL
const url = 'https://matsuri.5ch.net/morningcoffee/subback.html';

const falseList = [
  /[Pp][Aa][Rr][Tt]\d*/,
  /鈴木/,
  /中日ドラゴンズ/,
  /一人で行く/,
  /佐々木希/,
  /応援スレ/,
  /チンクエッティ/
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

function tweet(url, title, callback) {
  var client = new Twitter({
      consumer_key: credential.keys.consumer_key,
      consumer_secret: credential.keys.consumer_secret,
      access_token_key: credential.keys.access_token_key,
      access_token_secret: credential.keys.access_token_secret
  });
  var tweet_text = title + '\n' + url;
  client.post('statuses/update', {status: tweet_text}, function(error, tweet, response) {
    if (!error) {
      console.log(new Date() + ' tweet success: ' + tweet_text)
      callback()
    } else {
      console.log(error);
      callback(error)
    }
  });
}

function fetchAndTweet(data, callback) {
  const buf    = new Buffer.from(data, 'binary');  
  const retStr = iconv.decode(buf, "Shift_JIS");
  var list = retStr.replace(/\n/g, '').split('<a');
  for(var item of list){
    // Skip non thread title.
    if(/^.*href="\d+.*$/.test(item)) {
      var url = 'https://matsuri.5ch.net/test/read.cgi/morningcoffee/' + item.replace(/^.*href="([^"]+)".*$/, '$1');
      var title = item.replace(/^.*>([^>]+)<\/a>.*$/, '$1').replace(/&quot;/g, '').replace(/^\d+: /, '').replace(/\(\d+\)$/, '');
      if(checkAngerme(title)) {
        asyncRun(url, title, callback);
        break;
      }
    }
    function asyncRun(url, title, callback) {
      tweet(url, title, callback)
    }
  };
}

function run(url, callback) {
  const savepath = './test.html';
  var outfile = fs.createWriteStream(savepath);
  https.get(url, function(res){
    res.pipe(outfile);
    res.on('end', function () {
      outfile.close();
      fs.readFile(savepath, function(err, data){
        if(err) {
          console.log(err);
        }
        fetchAndTweet(data, callback)
      });
    });
  });
}

app.get('/', (req, res) => {
  run(url, function(err){
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