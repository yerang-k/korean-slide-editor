/**
 * 국어 수업 라이브 슬라이드 에디터 — 서버 (Google Apps Script)
 * Copyright (c) 2026 KIMYERANG. 무단 복제·배포·수정 금지
 *
 * - 화면(Index.html)은 GitHub에서 실시간으로 불러온다.
 *   (화면 코드가 바뀌어도 이 Code.gs는 손댈 필요 없이 자동 반영된다.)
 * - 데이터는 내 구글 드라이브의 폴더(국어수업슬라이드) 안에
 *   작품마다 JSON 파일 하나씩으로 저장한다. (여러 작품을 개별 저장)
 */

// 화면 코드가 올라가 있는 GitHub 원본 주소
var GITHUB_HTML_URL = 'https://raw.githubusercontent.com/yerang-k/korean-slide-editor/main/Index.html';

var FOLDER_NAME = '국어수업슬라이드';                 // 작품들이 담기는 드라이브 폴더
var OLD_SINGLE_FILE = '국어수업슬라이드_동기화.json';  // 예전 단일 저장 파일(있으면 옮겨옴)

// 웹앱 주소로 접속하면 GitHub의 화면을 불러와 보여준다.
function doGet() {
  var html = '';
  try {
    html = UrlFetchApp.fetch(GITHUB_HTML_URL, { muteHttpExceptions: true }).getContentText();
  } catch (err) {
    html = '';
  }
  if (!html) {
    html = '<p style="font-family:sans-serif;padding:40px">화면을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>';
  }
  var out = HtmlService.createHtmlOutput(html);
  out.setTitle('국어 수업 라이브 슬라이드 에디터');
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  return out;
}

// 최초 1회 실행용: 필요한 권한(드라이브 접근 · 외부 요청)을 한 번에 승인받는다.
// 편집기에서 이 함수를 골라 ▶ 실행 → 권한 허용하면 준비 끝.
function authorizeOnce() {
  UrlFetchApp.fetch(GITHUB_HTML_URL, { muteHttpExceptions: true });
  getFolder_();
  return 'OK';
}

// ---------- 드라이브 폴더/파일 도우미 ----------
function getFolder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return DriveApp.createFolder(FOLDER_NAME);
}

function getDeckFile_(name) {
  var folder = getFolder_();
  var it = folder.getFilesByName(name + '.json');
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return null;
}

// 예전 단일 파일이 있으면 폴더로 한 번만 옮겨온다(기존 작업 보존).
function migrateOldFile_(folder) {
  var chk = folder.getFiles();
  if (chk.hasNext()) return; // 폴더에 이미 뭔가 있으면 건너뜀
  var it = DriveApp.getFilesByName(OLD_SINGLE_FILE);
  while (it.hasNext()) {
    var old = it.next();
    if (old.isTrashed()) continue;
    folder.createFile('기본 슬라이드.json', old.getBlob().getDataAsString('UTF-8'), 'application/json');
    old.setTrashed(true);
    return;
  }
}

// ---------- 화면(Index.html)에서 호출하는 함수들 ----------
function listDecks() {
  var folder = getFolder_();
  migrateOldFile_(folder);
  var it = folder.getFiles();
  var arr = [];
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    var nm = f.getName();
    if (nm.length > 5 && nm.substring(nm.length - 5) === '.json') {
      arr.push({ name: nm.substring(0, nm.length - 5), updated: f.getLastUpdated().getTime() });
    }
  }
  arr.sort(function (a, b) { return b.updated - a.updated; }); // 최근 수정순
  return arr;
}

function loadDeck(name) {
  var f = getDeckFile_(name);
  return f ? f.getBlob().getDataAsString('UTF-8') : null;
}

function saveDeck(name, jsonString) {
  var f = getDeckFile_(name);
  if (f) f.setContent(jsonString);
  else getFolder_().createFile(name + '.json', jsonString, 'application/json');
  return { ok: true, name: name, savedAt: new Date().toISOString() };
}

function deleteDeck(name) {
  var f = getDeckFile_(name);
  if (f) f.setTrashed(true);
  return { ok: true };
}

function renameDeck(oldName, newName) {
  if (getDeckFile_(newName)) return { ok: false, error: '같은 이름이 이미 있음' };
  var f = getDeckFile_(oldName);
  if (!f) return { ok: false, error: '원본 없음' };
  f.setName(newName + '.json');
  return { ok: true };
}
