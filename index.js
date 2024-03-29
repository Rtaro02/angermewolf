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
  projectId: credential.firestore.projectId,
  keyFilename: credential.firestore.keyFilename,
});

// ダウンロード先のURL
const HOST = 'https://kizuna.5ch.net';
const WOLF_PATH = 'morningcoffee';

const falseList = [
  /鈴木/,
  /中日ドラゴンズ/,
  /一人で行く/,
  /応援スレ/,
  /[もモﾓ][もモﾓ][くクｸ][ろロﾛ]/,
  /ももいろクローバー/,
  /アンジュルム】佐々木莉佳子ちゃんが気になる/,
  /アンジュルム】タケちゃんこと竹内朱莉ちゃん/,
  /アンジュルム】田村芽実ファン倶楽部/,
  /アンジュルム】勝田里奈/,
  /アンジュルム】むろたんこと室田瑞希ちゃん/,
  /あやちょと飯窪さんが二人で鍋を囲んでたらありがちなこと/,
  /為永幸音ちゃんをみんな応援しとるわい/,
  /チンクエッティ/,
  /伊勢谷/,
  /竹内力/,
  /竹内まりや/,
  /竹内結子/,
  /竹内由恵/,
  /佐々木希/,
  /佐々木健介/,
  /安本彩花/,
  /華凜/,
  /松本人志/,
  /松本まりか/,
  /ダウンタウン松本/,
  /福田真琳/,
  /在日/,
  /朝鮮/
]

const trueList = [
  /笠原/,
  /桃奈/,
  /[かカｶ][さサｻ][はハﾊ][らラﾗ]/,
  /[もモﾓ][もモﾓ][なナﾅ]/,
  /[Kk][Aa][Ss][Aa][Hh][Aa][Rr][Aa]/,
  /[かカｶ][っッｯ][さサｻ]/,
  /[かカｶ][みミﾐ][かカｶ][さサｻ]/,
  /和田/,
  /彩花/,
  /[あアｱ][やヤﾔ][ちチﾁ][ょョｮ]/,
  /福田花音/,
  /[まマﾏ][ろロﾛ]/,
  /かにょん/,
  /前田憂佳/,
  /小川紗季/,
  /小数賀芙由香/,
  /中西/,
  /香菜/,
  /[かカｶ][なナﾅ][なナﾅ][んンﾝ]/,
  /勝田里奈/,
  /[りリﾘ][なナﾅ][ぷプﾌﾟ]/,
  /田村芽実/,
  /[めメﾒ][いイｲ][めメﾒ][いイｲ]/,
  /相川茉穂/,
  /[あアｱ][いイｲ][あアｱ][いイｲ]/,
  /太田/,
  /はーちゃん/,
  /竹内/,
  /朱莉/,
  /川村/,
  /文乃/,
  /[かカｶ][わワﾜ][むムﾑ]/,
  /佐々木/,
  /莉佳子/,
  /ささっき/,
  /りかこ/,
  /上國料/,
  /萌衣/,
  /[かカｶ][みミﾐ][ココｺ]/,
  /船木/,
  /[むムﾑ][すスｽ][ぶブﾌﾞうウｳ]/,
  /伊勢/,
  /鈴蘭/,
  /いせぴん/,
  /れらぴ/,
  /橋迫/,
  /川名/,
  /凜/,
  /凛/,
  /[けケ][ろロ]/,
  /為永/,
  /幸音/,
  /松本/,
  /わかな/,
  /平山/,
  /遊季/,
  /[ぺペ][いイ]/,
  /[あアｱ][んンﾝ][じジｼﾞ][ゅュｭ][るルﾙ]*[むムﾑ]*/,
  /[AaＡａ][NnＮｎ][GgＧｇ][EeＥｅ][RrＲｒ][MmＭｍ][EeＥｅ]/
]

const client = new Twitter({
  consumer_key: credential.keys.consumer_key,
  consumer_secret: credential.keys.consumer_secret,
  access_token_key: credential.keys.access_token_key,
  access_token_secret: credential.keys.access_token_secret
});

function tweet(x) {
  const docRef = db.collection('5ch-thread');
  console.log(`${x.title} check existence`);
  docRef.doc(x.id).get().then(doc => {
    if (!doc.exists) {
      console.log(`${x.title} is will tweet`)
      var tweet_text = x.title + '\n' + x.url;
      client.post('statuses/update', { status: tweet_text }, function (error, tweet, response) {
        if (!error) {
          docRef.doc(x.id).set({
            "url": x.url,
            "timestamp": new Date()
          })
          console.log(new Date() + ' tweet success: ' + tweet_text);
        } else {
          console.log(error);
        }
      });
    } else {
      console.log(`${x.title} was already tweeted`);
    }
  }).catch((error) => {
    console.log("Error getting document:", error);
  })
}

function checkAngerme(x) {
  // Exception Area
  for (var fl of falseList) {
    if (fl.test(x)) return false;
  }
  for (var tl of trueList) {
    if (tl.test(x)) return true;
  }
  // If x includes momona, this sentence have momona topic even if other members name is there.
  return false;
}

function parse(x) {
  var l = [];
  var list = x.replace(/\n/g, '').split('<a');
  for (var item of list) {
    // Skip non thread title.
    if (/^.*href="\d+.*$/.test(item)) {
      var unit = {};
      unit.id = item.replace(/^.*href="([^\/]+)\/.*$/, '$1');
      unit.url = `${HOST}/test/read.cgi/${WOLF_PATH}/${unit.id}`;
      unit.title = item.replace(/^.*>([^>]+)<\/a>.*$/, '$1').replace(/&quot;/g, '').replace(/^\d+: /, '').replace(/\(\d+\)$/, '');
      if (checkAngerme(unit.title)) {
        l.push(unit);
      }
    }
  };
  return l;
}

function run(url, callback) {
  console.log("send request");
  request(url).on('error', (err) => { reject(err) })
    .pipe(iconv.decodeStream("windows-31j"))
    .collect((err, body) => {
      if (err) {
        console.error("error occured")
        return callback(err);
      }
      console.log("request succeeded")
      console.log(`responseBody: ${body}`)
      var list = parse(body);
      list.forEach(l => { tweet(l) })
      return callback();
    });
}

exports.execute = (event, context) => {
  console.log("execution started");
  run(`${HOST}/${WOLF_PATH}/subback.html`, function () { })
}

module.exports.execute()
