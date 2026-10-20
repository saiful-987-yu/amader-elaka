/*
AMADER ELAKA — GOOGLE APPS SCRIPT BACKEND
Deploy as a Web app (Execute as: Me, Access: Anyone) and put the URL in config/config.js as API_BASE_URL.
Sheet tabs and column headers: see README.md.
*/

const SHEET_DRIVERS = "Users";
const SHEET_PENDING = "Pending Users";
const SHEET_MARKETS = "Markets";
const SHEET_VEHICLES = "All Categories";
const SHEET_SESSIONS = "Sessions";
const SHEET_RATINGS = "Public Ratings";
const SHEET_ADMIN_HISTORY = "Admin Editor History";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_RENEW_AFTER_MS = 1000 * 60 * 60 * 24;
const DOCTOR_CATEGORY_SLUG = "doctor";
const DATE_FORMAT = "dd-MM-yy HH:mm";
const DATE_TIMEZONE = "Asia/Dhaka";
const TEXT_DATE_HEADERS = ["Created Date", "Updated Date", "Submitted Date", "Date Time", "Expires At"];

const HEADER_ALIASES = {
"Profile ID": "Driver ID",
"Category": "Vehicle Type",
"Reference Number": "Vehicle Number",
"Profile Image URL": "Driver Image URL",
"Gallery Image URL": "Vehicle Image URL",
"Experience": "Driving Experience",
"Category Image URL": "Vehicle Categories Image URL"
};

function normHeader(h) {
const t = String(h).trim();
return HEADER_ALIASES[t] || t;
}

function doGet(e) {
return respond({ ok: false, errorCode: "USE_POST" });
}

function doPost(e) {
const op = e.parameter.op;
let payload = {};
try {
payload = JSON.parse(e.postData.contents || "{}");
} catch (err) {
return respond({ ok: false, errorCode: "BAD_REQUEST" });
}

try {
switch (op) {
case "getMarkets": return respond({ ok: true, result: getMarkets() });
case "getVehicleCategories": return respond({ ok: true, result: getVehicleCategories() });
case "getDrivers": return respond({ ok: true, result: getDrivers(payload) });
case "registerDriver": return respond({ ok: true, result: registerDriver(payload) });
case "uploadDriverPhoto": return respond({ ok: true, result: uploadDriverPhoto(payload) });
case "checkUsername": return respond({ ok: true, result: checkUsernameAvailable(payload) });
case "checkPhone": return respond({ ok: true, result: checkPhoneAvailable(payload) });
case "login": return respond({ ok: true, result: login(payload) });
case "getProfile": return respond({ ok: true, result: getProfile(payload) });
case "updateAvailability": return respond({ ok: true, result: updateAvailability(payload) });
case "updateProfile": return respond({ ok: true, result: updateProfile(payload) });
case "changePassword": return respond({ ok: true, result: changePassword(payload) });
case "getPublicRatings": return respond({ ok: true, result: getPublicRatings(payload) });
case "submitPublicRating": return respond({ ok: true, result: submitPublicRating(payload) });
case "adminEnableMode": return respond({ ok: true, result: adminEnableMode(payload) });
case "adminAdjustMode": return respond({ ok: true, result: adminAdjustMode(payload) });
case "adminModeStatus": return respond({ ok: true, result: adminModeStatus(payload) });
case "adminDisableMode": return respond({ ok: true, result: adminDisableMode(payload) });
case "adminListPending": return respond({ ok: true, result: adminListPending(payload) });
case "adminGetRecord": return respond({ ok: true, result: adminGetRecord(payload) });
case "adminSaveRecord": return respond({ ok: true, result: adminSaveRecord(payload) });
case "adminCreateRecord": return respond({ ok: true, result: adminCreateRecord(payload) });
case "adminApprovePending": return respond({ ok: true, result: adminApprovePending(payload) });
case "adminListPendingRatings": return respond({ ok: true, result: adminListPendingRatings(payload) });
case "adminApproveRating": return respond({ ok: true, result: adminApproveRating(payload) });
case "adminPendingCounts": return respond({ ok: true, result: adminPendingCounts(payload) });
default: return respond({ ok: false, errorCode: "UNKNOWN_OPERATION" });
}
} catch (err) {
const code = err && err.code ? err.code : "SERVER_ERROR";
return respond({ ok: false, errorCode: code });
}
}

function respond(obj) {
return ContentService.createTextOutput(JSON.stringify(obj))
.setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
if (!s) throw appError("MISSING_SHEET_" + name.toUpperCase().replace(/ /g, "_"));
return s;
}

let ROW_MEMO = {};

function dropRowMemo() { ROW_MEMO = {}; }

function readRows(sheetName) {
if (ROW_MEMO[sheetName]) return ROW_MEMO[sheetName];
const s = sheet(sheetName);
const values = s.getDataRange().getValues();
if (values.length < 2) return [];
const headers = values[0].map(normHeader);
const rows = values.slice(1)
.filter((row) => row.some((cell) => cell !== "" && cell !== null))
.map((row) => {
const obj = {};
headers.forEach((h, i) => { obj[h] = row[i]; });
return obj;
});
ROW_MEMO[sheetName] = rows;
return rows;
}

function writeCells(s, rowNumber, headers, updates) {
const cols = [];
const updatedCol = headers.indexOf("Updated Date");
Object.keys(updates).forEach((colName) => {
const col = headers.indexOf(colName);
if (col !== -1 && col !== updatedCol) cols.push({ col: col + 1, value: updates[colName] });
});
cols.sort((a, b) => a.col - b.col);
let i = 0;
while (i < cols.length) {
let j = i;
while (j + 1 < cols.length && cols[j + 1].col === cols[j].col + 1) j++;
s.getRange(rowNumber, cols[i].col, 1, j - i + 1).setValues([cols.slice(i, j + 1).map((c) => c.value)]);
i = j + 1;
}
if (updatedCol !== -1) s.getRange(rowNumber, updatedCol + 1).setNumberFormat("@").setValue(nowText());
dropRowMemo();
}

function appendRow(sheetName, headerToValueMap) {
const s = sheet(sheetName);
const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(normHeader);
const row = headers.map((h) => (headerToValueMap[h] !== undefined ? headerToValueMap[h] : ""));
headers.forEach((h, i) => {
if (TEXT_DATE_HEADERS.indexOf(h) !== -1 && headerToValueMap[h] !== undefined) s.getRange(2, i + 1, Math.max(1, s.getMaxRows() - 1), 1).setNumberFormat("@");
});
s.appendRow(row);
dropRowMemo();
}

function appError(code) {
const err = new Error(code);
err.code = code;
return err;
}

function clean(v) { return (v == null ? "" : String(v)).trim(); }

function msText(ms) {
return Utilities.formatDate(new Date(ms), DATE_TIMEZONE, DATE_FORMAT);
}

function nowText() {
return Utilities.formatDate(new Date(), DATE_TIMEZONE, DATE_FORMAT);
}

function parseDateValue(v) {
if (v instanceof Date) return v.getTime();
const t = clean(v);
if (!t) return NaN;
const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
if (m) {
let y = Number(m[3]);
if (y < 100) y += 2000;
return Date.UTC(y, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)) - 6 * 3600000;
}
return new Date(t).getTime();
}

function dateText(v) {
const ms = parseDateValue(v);
if (isNaN(ms)) return clean(v);
return Utilities.formatDate(new Date(ms), DATE_TIMEZONE, DATE_FORMAT);
}
function slugOf(v) { return clean(v).toLowerCase(); }

function getMarkets() {
return readRows(SHEET_MARKETS)
.filter((r) => slugOf(r["Status"]) === "active")
.sort((a, b) => Number(a["Sort Order"] || 0) - Number(b["Sort Order"] || 0))
.map((r) => ({
id: clean(r["Market ID"]),
slug: slugify(r["Market Name English"]),
nameEn: clean(r["Market Name English"]),
nameBn: clean(r["Market Name Bengali"]),
imageUrl: clean(r["Markets Image URL"]),
bgImageUrl: clean(r["Markets BG Image URL"]),
status: "active",
sortOrder: Number(r["Sort Order"] || 0)
}));
}

function getVehicleCategories() {
return readRows(SHEET_VEHICLES)
.filter((r) => slugOf(r["Status"]) === "active")
.sort((a, b) => Number(a["Sort Order"] || 0) - Number(b["Sort Order"] || 0))
.map((r) => ({
id: clean(r["Category ID"]),
slug: slugify(r["English Name"]),
nameEn: clean(r["English Name"]),
nameBn: clean(r["Bengali Name"]),
icon: slugify(r["English Name"]),
imageUrl: clean(r["Vehicle Categories Image URL"]),
isOther: slugOf(r["Other Categories"]) === "true",
status: "active",
sortOrder: Number(r["Sort Order"] || 0)
}));
}

function slugify(text) {
return clean(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function slugifyMulti(text) {
return clean(text).split(",").map(function (part) { return slugify(part.trim()); })
.filter(Boolean).join(", ");
}

function multiIncludes(rawHaystack, needle) {
return clean(rawHaystack).split(",").map(function (s) { return slugify(s.trim()); }).indexOf(needle) !== -1;
}

function getDrivers(payload) {
const marketSlug = slugOf(payload.marketSlug);
const vehicleSlug = slugOf(payload.vehicleSlug);
const query = clean(payload.query).toLowerCase();
const queryDigits = query.replace(/\D/g, "");

return readRows(SHEET_DRIVERS)
.filter((r) => slugOf(r["Status"]) === "active")
.filter((r) => !marketSlug || multiIncludes(r["Bazar"], marketSlug))
.filter((r) => !vehicleSlug || multiIncludes(r["Vehicle Type"], vehicleSlug))
.filter((r) => {
if (!query) return true;
const name = clean(r["Name"]).toLowerCase();
const phoneDigits = clean(r["Phone"]).replace(/\D/g, "");
return name.includes(query) || (queryDigits && phoneDigits.includes(queryDigits));
})
.map(publicDriverFields);
}

function publicRatingCacheValue(r) { return Number(r["Public Rating Cache"]) || 0; }
function publicRatingCountValue(r) { return Number(r["Public Rating Count"]) || 0; }
function manualRatingValue(r) { return Number(r["Manual Rating"]) || 0; }
function finalRatingValue(r) {
return Math.min(publicRatingCacheValue(r) + manualRatingValue(r), 5);
}

function publicDriverFields(r) {
return {
driverId: clean(r["Driver ID"]),
name: clean(r["Name"]),
nameBn: clean(r["Bengali Name"]),
phone: clean(r["Phone"]),
altPhone: clean(r["Alternative Phone"]),
vehicleType: slugifyMulti(r["Vehicle Type"]),
vehicleNumber: clean(r["Vehicle Number"]),
marketSlug: slugifyMulti(r["Bazar"]),
serviceArea: clean(r["Service Area"]),
experience: clean(r["Driving Experience"]),
rating: clean(r["Star Rating"]),
whatsapp: clean(r["WhatsApp"]),
imageUrl: clean(r["Driver Image URL"]),
vehicleImageUrl: clean(r["Vehicle Image URL"]),
availability: slugOf(r["Availability"]) === "active" ? "active" : "inactive",
emergency: slugOf(r["Emergency Contact"]) === "true",
doctor: multiIncludes(r["Vehicle Type"], DOCTOR_CATEGORY_SLUG),
qualification: clean(r["Qualification"]),
extra1: clean(r["Extra 1"]),
extra2: clean(r["Extra 2"]),
extra3: clean(r["Extra 3"]),
extra4: clean(r["Extra 4"]),
sortStatus: clean(r["Sort Status"]),
personalDetails: clean(r["Personal Details"]),
videoUrl: clean(r["Video URL"]),
socialUrl: clean(r["Social Media URL"]),
publicRating: publicRatingCacheValue(r),
publicRatingCount: publicRatingCountValue(r),
finalRating: finalRatingValue(r)
};
}

function checkUsernameAvailable(payload) {
const username = clean(payload.username).toLowerCase();
if (!username) return { available: false };
const taken = readRows(SHEET_DRIVERS).some((r) => clean(r["Username"]).toLowerCase() === username) ||
readRows(SHEET_PENDING).some((r) => clean(r["Username"]).toLowerCase() === username);
return { available: !taken };
}

function phoneKey(v) {
let d = clean(v).replace(/\D/g, "");
if (d.indexOf("00880") === 0) d = d.slice(2);
if (d.length === 13 && d.indexOf("880") === 0) return "0" + d.slice(3);
if (d.length === 10 && d.charAt(0) === "1") return "0" + d;
return d;
}

function checkPhoneAvailable(payload) {
const phoneDigits = phoneKey(payload.phone);
if (!phoneDigits) return { available: false };
const taken = readRows(SHEET_DRIVERS).some((r) => phoneKey(r["Phone"]) === phoneDigits) ||
readRows(SHEET_PENDING).some((r) => phoneKey(r["Phone"]) === phoneDigits);
return { available: !taken };
}

function registerDriver(payload) {
const phoneDigits = phoneKey(payload.phone);
const username = clean(payload.username);
if (!phoneDigits || !username || !payload.password) throw appError("VALIDATION_FAILED");

const existingPhones = readRows(SHEET_DRIVERS).map((r) => phoneKey(r["Phone"]))
.concat(readRows(SHEET_PENDING).map((r) => phoneKey(r["Phone"])));
if (existingPhones.includes(phoneDigits)) throw appError("DUPLICATE_PHONE");

const existingUsernames = readRows(SHEET_DRIVERS).map((r) => clean(r["Username"]).toLowerCase())
.concat(readRows(SHEET_PENDING).map((r) => clean(r["Username"]).toLowerCase()));
if (existingUsernames.includes(username.toLowerCase())) throw appError("DUPLICATE_USERNAME");

const applicationId = "APP-" + Date.now().toString(36).toUpperCase();

appendRow(SHEET_PENDING, {
"Application ID": applicationId,
"Name": clean(payload.fullName),
"Bengali Name": clean(payload.fullNameBn),
"Father/Husband Name": clean(payload.guardianName),
"Phone": clean(payload.phone),
"Alternative Phone": clean(payload.altPhone),
"WhatsApp": clean(payload.whatsapp),
"Village": clean(payload.village),
"Post Office": clean(payload.postOffice),
"Union": clean(payload.union),
"Upazila": clean(payload.upazila),
"District": clean(payload.district),
"Full Address": clean(payload.fullAddress),
"Vehicle Type": clean(payload.vehicleType),
"Vehicle Number": clean(payload.vehicleNumber),
"Bazar": clean(payload.marketSlug),
"Service Area": clean(payload.serviceArea),
"Driving Experience": clean(payload.experience),
"Driver Image URL": clean(payload.imageUrl),
"Vehicle Image URL": clean(payload.vehicleImageUrl),
"Social Media URL": clean(payload.socialUrl),
"Qualification": clean(payload.qualification),
"Extra 1": clean(payload.extra1),
"Extra 2": clean(payload.extra2),
"Extra 3": clean(payload.extra3),
"Extra 4": clean(payload.extra4),
"Username": username,
"Password": hashPassword(payload.password),
"Application Status": "pending",
"Submitted Date": nowText()
});

return { applicationId };
}

const DRIVER_PHOTOS_FOLDER_NAME = "Amader Elaka - Profile Photos";
const MIN_PHOTO_BYTES = 50 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

function ensureDriverPhotosFolder() {
const existing = DriveApp.getFoldersByName(DRIVER_PHOTOS_FOLDER_NAME);
if (existing.hasNext()) return existing.next();
return DriveApp.createFolder(DRIVER_PHOTOS_FOLDER_NAME);
}

function uploadDriverPhoto(payload) {
const base64Data = String(payload.imageBase64 || "");
const mimeType = String(payload.mimeType || "");
if (!base64Data) throw appError("VALIDATION_FAILED");
if (["image/jpeg", "image/png", "image/webp"].indexOf(mimeType) === -1) throw appError("VALIDATION_FAILED");

let bytes;
try {
bytes = Utilities.base64Decode(base64Data);
} catch (err) {
throw appError("VALIDATION_FAILED");
}
if (bytes.length < MIN_PHOTO_BYTES || bytes.length > MAX_PHOTO_BYTES) throw appError("VALIDATION_FAILED");

const extension = mimeType.split("/")[1] || "jpg";
const fileName = "driver-photo-" + new Date().getTime() + "." + extension;
const blob = Utilities.newBlob(bytes, mimeType, fileName);
const folder = ensureDriverPhotosFolder();
const file = folder.createFile(blob);
file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
return { url: file.getUrl() };
}

function hashPassword(plain) {
const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain, Utilities.Charset.UTF_8);
return digest.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function login(payload) {
const identifier = slugOf(payload.identifier).replace(/\s+/g, "");
const identifierDigits = identifier.replace(/\D/g, "");

const driverRow = readRows(SHEET_DRIVERS).find((r) => {
const uname = clean(r["Username"]).toLowerCase();
const phoneDigits = clean(r["Phone"]).replace(/\D/g, "");
return uname === identifier || (identifierDigits && phoneDigits === identifierDigits);
});

if (!driverRow || hashPassword(payload.password || "").toLowerCase() !== clean(driverRow["Password"]).toLowerCase()) {
const pendingMatch = readRows(SHEET_PENDING).find((p) => {
const uname = clean(p["Username"]).toLowerCase();
const phoneDigits = clean(p["Phone"]).replace(/\D/g, "");
return uname === identifier || (identifierDigits && phoneDigits === identifierDigits);
});
if (pendingMatch) throw appError("PENDING_APPROVAL");
throw appError("INVALID_CREDENTIALS");
}

const driverId = clean(driverRow["Driver ID"]);
const token = createSession(driverId);
return { token, driver: driverProfileFields(driverRow) };
}

function driverProfileFields(row) {
return Object.assign(publicDriverFields(row), {
accountStatus: slugOf(row["Status"]) || "active",
username: clean(row["Username"]),
guardianName: clean(row["Father/Husband Name"]),
village: clean(row["Village"]),
postOffice: clean(row["Post Office"]),
union: clean(row["Union"]),
upazila: clean(row["Upazila"]),
district: clean(row["District"]),
fullAddress: clean(row["Full Address"]),
isAdmin: isAdminRow(row)
});
}

const SESSION_CACHE_SECONDS = 3600;

function sessionCacheKey(token) { return "session:" + token; }

function purgeExpiredSessions() {
const cache = CacheService.getScriptCache();
if (cache.get("sessions:purged")) return;
cache.put("sessions:purged", "1", SESSION_CACHE_SECONDS);
const s = sheet(SHEET_SESSIONS);
const lastRow = s.getLastRow();
if (lastRow < 2) return;
const values = s.getRange(2, 1, lastRow - 1, 3).getValues();
const now = Date.now();
const keep = values.filter((r) => {
if (clean(r[0]) === "") return false;
const t = parseDateValue(r[2]);
return !isNaN(t) && t >= now;
});
if (keep.length === values.length) return;
s.getRange(2, 1, values.length, 3).clearContent();
if (keep.length) s.getRange(2, 1, keep.length, 3).setNumberFormat("@").setValues(keep.map((r) => [String(r[0]), String(r[1]), dateText(r[2])]));
dropRowMemo();
}

function createSession(driverId) {
ensureSessionsSheet();
const token = Utilities.getUuid();
const expiresAt = Date.now() + SESSION_TTL_MS;
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
try { purgeExpiredSessions(); } catch (err) { Logger.log("purgeExpiredSessions failed: " + err); }
appendRow(SHEET_SESSIONS, {
"Token": token,
"Driver ID": driverId,
"Expires At": msText(expiresAt)
});
} finally {
lock.releaseLock();
}
CacheService.getScriptCache().put(sessionCacheKey(token), JSON.stringify({ d: driverId, e: expiresAt }), SESSION_CACHE_SECONDS);
return token;
}

function ensureSessionsSheet() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
if (!ss.getSheetByName(SHEET_SESSIONS)) {
const s = ss.insertSheet(SHEET_SESSIONS);
s.appendRow(["Token", "Driver ID", "Expires At"]);
}
}

function sessionNeedsRenewal(expiresAt) {
return Number(expiresAt) - Date.now() < SESSION_TTL_MS - SESSION_RENEW_AFTER_MS;
}

function renewSession(token, currentExpiresAt) {
const next = Date.now() + SESSION_TTL_MS;
try {
const lock = LockService.getScriptLock();
lock.waitLock(5000);
try {
const s = sheet(SHEET_SESSIONS);
const lastRow = s.getLastRow();
if (lastRow < 2) return currentExpiresAt;
const tokens = s.getRange(2, 1, lastRow - 1, 1).getValues();
for (let i = 0; i < tokens.length; i++) {
if (clean(tokens[i][0]) === token) {
s.getRange(i + 2, 3).setNumberFormat("@").setValue(msText(next));
dropRowMemo();
return next;
}
}
} finally {
lock.releaseLock();
}
} catch (err) {
Logger.log("renewSession failed: " + err);
}
return currentExpiresAt;
}

function resolveSession(token) {
if (!token) throw appError("SESSION_EXPIRED");
const cache = CacheService.getScriptCache();
const cachedRaw = cache.get(sessionCacheKey(token));
if (cachedRaw) {
try {
const c = JSON.parse(cachedRaw);
if (c && c.d && Number(c.e) > Date.now() && !sessionNeedsRenewal(c.e)) return c.d;
} catch (err) {
}
}
ensureSessionsSheet();
const rows = readRows(SHEET_SESSIONS);
const match = rows.find((r) => clean(r["Token"]) === token);
if (!match) throw appError("SESSION_EXPIRED");
const expiresAt = parseDateValue(match["Expires At"]);
if (isNaN(expiresAt) || expiresAt < Date.now()) throw appError("SESSION_EXPIRED");
const driverId = clean(match["Driver ID"]);
const finalExpiresAt = sessionNeedsRenewal(expiresAt) ? renewSession(token, expiresAt) : expiresAt;
cache.put(sessionCacheKey(token), JSON.stringify({ d: driverId, e: finalExpiresAt }), SESSION_CACHE_SECONDS);
return driverId;
}

function getProfile(payload) {
const driverId = resolveSession(payload.token);
const driverRow = readRows(SHEET_DRIVERS).find((r) => clean(r["Driver ID"]) === driverId);
if (!driverRow) throw appError("SESSION_EXPIRED");
return driverProfileFields(driverRow);
}

function writeDriverRow(driverId, updates) {
const s = sheet(SHEET_DRIVERS);
const values = s.getDataRange().getValues();
const headers = values[0].map(normHeader);
const idCol = headers.indexOf("Driver ID");
if (idCol === -1) throw appError("SHEET_MISCONFIGURED");

for (let i = 1; i < values.length; i++) {
if (clean(values[i][idCol]) === driverId) {
writeCells(s, i + 1, headers, updates);
return readRows(SHEET_DRIVERS).find((r) => clean(r["Driver ID"]) === driverId);
}
}
throw appError("SESSION_EXPIRED");
}

function updateAvailability(payload) {
const driverId = resolveSession(payload.token);
const value = payload.availability === "active" ? "Active" : "Inactive";
const driverRow = writeDriverRow(driverId, { "Availability": value });
return driverProfileFields(driverRow);
}

function updateProfile(payload) {
const driverId = resolveSession(payload.token);
const fieldMap = {
name: "Name",
nameBn: "Bengali Name",
guardianName: "Father/Husband Name",
village: "Village",
postOffice: "Post Office",
union: "Union",
upazila: "Upazila",
district: "District",
fullAddress: "Full Address",
experience: "Driving Experience",
altPhone: "Alternative Phone",
whatsapp: "WhatsApp",
serviceArea: "Service Area",
vehicleNumber: "Vehicle Number",
qualification: "Qualification",
extra1: "Extra 1",
extra2: "Extra 2",
extra3: "Extra 3",
extra4: "Extra 4"
};
const updates = {};
Object.keys(fieldMap).forEach((key) => {
if (payload[key] !== undefined) updates[fieldMap[key]] = clean(payload[key]);
});
if (!Object.keys(updates).length || updates["Name"] === "") throw appError("VALIDATION_FAILED");
const driverRow = writeDriverRow(driverId, updates);
return driverProfileFields(driverRow);
}

function changePassword(payload) {
const driverId = resolveSession(payload.token);
const driverRow = readRows(SHEET_DRIVERS).find((r) => clean(r["Driver ID"]) === driverId);
if (!driverRow) throw appError("SESSION_EXPIRED");
if (hashPassword(payload.oldPassword || "").toLowerCase() !== clean(driverRow["Password"]).toLowerCase()) {
throw appError("INVALID_CREDENTIALS");
}
if (!payload.newPassword || String(payload.newPassword).length < 6) throw appError("VALIDATION_FAILED");
writeDriverRow(driverId, { "Password": hashPassword(payload.newPassword) });
return { ok: true };
}

function ensureRatingsSheet() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
if (!ss.getSheetByName(SHEET_RATINGS)) {
const s = ss.insertSheet(SHEET_RATINGS);
s.appendRow(["Rating ID", "Target Type", "Target ID", "Star Rating", "Comment", "Date Time", "Verified"]);
}
}

function submitPublicRating(payload) {
const targetType = "driver";
const targetId = clean(payload.targetId);
const stars = Math.round(Number(payload.stars));
if (!targetId || !stars || stars < 1 || stars > 5) throw appError("VALIDATION_FAILED");

const exists = readRows(SHEET_DRIVERS).some((r) => clean(r["Driver ID"]) === targetId && slugOf(r["Status"]) === "active");
if (!exists) throw appError("VALIDATION_FAILED");

ensureRatingsSheet();
appendRow(SHEET_RATINGS, {
"Rating ID": Utilities.getUuid(),
"Target Type": targetType,
"Target ID": targetId,
"Star Rating": stars,
"Comment": clean(payload.comment).slice(0, 1000),
"Date Time": nowText(),
"Verified": "FALSE"
});
return { ok: true };
}

function getPublicRatings(payload) {
const targetType = "driver";
const targetId = clean(payload.targetId);
if (!targetId) return [];
ensureRatingsSheet();
const list = readRows(SHEET_RATINGS)
.filter((r) => slugOf(r["Target Type"]) === targetType)
.filter((r) => clean(r["Target ID"]) === targetId)
.filter((r) => slugOf(r["Verified"]) === "true")
.sort((a, b) => parseDateValue(b["Date Time"]) - parseDateValue(a["Date Time"]))
.map((r) => ({
stars: Number(r["Star Rating"]) || 0,
comment: clean(r["Comment"]),
dateTime: r["Date Time"] ? dateText(r["Date Time"]) : ""
}));
return payload.all ? list : list.slice(0, 2);
}

function recalcTargetRating(targetType, targetId) {
const verified = readRows(SHEET_RATINGS).filter((r) =>
slugOf(r["Target Type"]) === targetType &&
clean(r["Target ID"]) === targetId &&
slugOf(r["Verified"]) === "true"
);
const count = verified.length;
const avg = count ? verified.reduce((sum, r) => sum + (Number(r["Star Rating"]) || 0), 0) / count : 0;

const s = sheet(SHEET_DRIVERS);
const values = s.getDataRange().getValues();
const headers = values[0].map(normHeader);
const idCol = headers.indexOf("Driver ID");
const cacheCol = headers.indexOf("Public Rating Cache");
const countCol = headers.indexOf("Public Rating Count");
if (idCol === -1) return;
for (let i = 1; i < values.length; i++) {
if (clean(values[i][idCol]) === targetId) {
if (cacheCol !== -1) s.getRange(i + 1, cacheCol + 1).setValue(Math.round(avg * 10) / 10);
if (countCol !== -1) s.getRange(i + 1, countCol + 1).setValue(count);
dropRowMemo();
return;
}
}
}

function onEdit(e) {
try {
if (!e || !e.range) return;
const sh = e.range.getSheet();
if (sh.getName() !== SHEET_RATINGS) return;

const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(normHeader);
const verifiedCol = headers.indexOf("Verified") + 1;
const targetTypeCol = headers.indexOf("Target Type");
const targetIdCol = headers.indexOf("Target ID");
if (verifiedCol < 1 || targetTypeCol === -1 || targetIdCol === -1) return;

const editedFirstCol = e.range.getColumn();
const editedLastCol = editedFirstCol + e.range.getNumColumns() - 1;
if (verifiedCol < editedFirstCol || verifiedCol > editedLastCol) return;

const startRow = e.range.getRow();
if (startRow < 2) return;
const numRows = e.range.getNumRows();
const editedRows = sh.getRange(startRow, 1, numRows, sh.getLastColumn()).getValues();

const seen = {};
editedRows.forEach((row) => {
const type = "driver";
const id = String(row[targetIdCol]).trim();
if (!id) return;
const key = type + "|" + id;
if (seen[key]) return;
seen[key] = true;
recalcTargetRating(type, id);
});
} catch (err) {
}
}

// ADMIN MODE: Admin Status = TRUE (set only in the Sheet) + password re-check gives a short-lived token; every admin call re-checks session, Admin Status and token on the server.
const ADMIN_MODE_DEFAULT_MIN = 30;
const ADMIN_MODE_MAX_MIN = 120;
const ADMIN_MODE_STEPS_MIN = [-60, -30, -10, 10, 30, 60];

function isAdminRow(row) {
return slugOf(row["Admin Status"]) === "true";
}

function requireAdminSession(payload) {
const driverId = resolveSession(payload.token);
const row = readRows(SHEET_DRIVERS).find((r) => clean(r["Driver ID"]) === driverId);
if (!row) throw appError("SESSION_EXPIRED");
if (!isAdminRow(row)) throw appError("NOT_ADMIN");
return { driverId: driverId, row: row };
}

function adminModeKey(adminToken) { return "adminmode:" + adminToken; }

function putAdminMode(adminToken, driverId, expiresAt) {
const ttlSeconds = Math.max(1, Math.min(21600, Math.ceil((expiresAt - Date.now()) / 1000) + 60));
CacheService.getScriptCache().put(adminModeKey(adminToken), JSON.stringify({ driverId: driverId, exp: expiresAt }), ttlSeconds);
}

function requireAdminMode(payload) {
const who = requireAdminSession(payload);
const adminToken = clean(payload.adminToken);
if (!adminToken) throw appError("ADMIN_MODE_OFF");
const cache = CacheService.getScriptCache();
const raw = cache.get(adminModeKey(adminToken));
if (!raw) throw appError("ADMIN_MODE_OFF");
let rec = null;
try { rec = JSON.parse(raw); } catch (err) { rec = null; }
if (!rec || rec.driverId !== who.driverId || Number(rec.exp) <= Date.now()) {
cache.remove(adminModeKey(adminToken));
throw appError("ADMIN_MODE_OFF");
}
return { driverId: who.driverId, row: who.row, adminToken: adminToken, exp: Number(rec.exp) };
}

function adminEnableMode(payload) {
const who = requireAdminSession(payload);
if (hashPassword(payload.password || "").toLowerCase() !== clean(who.row["Password"]).toLowerCase()) {
throw appError("INVALID_CREDENTIALS");
}
const adminToken = Utilities.getUuid();
const expiresAt = Date.now() + ADMIN_MODE_DEFAULT_MIN * 60000;
putAdminMode(adminToken, who.driverId, expiresAt);
return { adminToken: adminToken, expiresAt: expiresAt, serverNow: Date.now() };
}

function adminModeStatus(payload) {
const ctx = requireAdminMode(payload);
return { expiresAt: ctx.exp, serverNow: Date.now() };
}

function adminAdjustMode(payload) {
const ctx = requireAdminMode(payload);
const delta = Number(payload.deltaMinutes);
if (ADMIN_MODE_STEPS_MIN.indexOf(delta) === -1) throw appError("VALIDATION_FAILED");
const now = Date.now();
const next = Math.min(ctx.exp + delta * 60000, now + ADMIN_MODE_MAX_MIN * 60000);
if (next <= now) {
CacheService.getScriptCache().remove(adminModeKey(ctx.adminToken));
return { expired: true };
}
putAdminMode(ctx.adminToken, ctx.driverId, next);
return { expiresAt: next, serverNow: Date.now() };
}

function adminDisableMode(payload) {
const adminToken = clean(payload.adminToken);
if (adminToken) CacheService.getScriptCache().remove(adminModeKey(adminToken));
return { ok: true };
}

// Editable columns whitelist — "Admin Status" is deliberately NOT here
const ADMIN_TEXT_COLUMNS_COMMON = {
name: "Name", nameBn: "Bengali Name", phone: "Phone", altPhone: "Alternative Phone",
whatsapp: "WhatsApp", vehicleType: "Vehicle Type", vehicleNumber: "Vehicle Number",
serviceArea: "Service Area", experience: "Driving Experience",
imageUrl: "Driver Image URL", vehicleImageUrl: "Vehicle Image URL", socialUrl: "Social Media URL",
qualification: "Qualification",
extra1: "Extra 1", extra2: "Extra 2", extra3: "Extra 3", extra4: "Extra 4"
};
const ADMIN_REGISTRATION_ONLY_COLUMNS = {
guardianName: "Father/Husband Name", village: "Village", postOffice: "Post Office", union: "Union",
upazila: "Upazila", district: "District", fullAddress: "Full Address", bazar: "Bazar", username: "Username"
};
const ADMIN_MANAGED_COLUMNS = {
status: "Status", availability: "Availability", starRating: "Star Rating", manualRating: "Manual Rating",
personalDetails: "Personal Details", videoUrl: "Video URL"
};
const ADMIN_DRIVER_ONLY_MANAGED = { emergency: "Emergency Contact", sortStatus: "Sort Status" };

function adminKindSpec(kind) {
if (kind === "driver") {
return {
sheet: SHEET_DRIVERS, idHeader: "Driver ID", hasPassword: true, checkUnique: true,
cols: Object.assign({}, ADMIN_TEXT_COLUMNS_COMMON, ADMIN_REGISTRATION_ONLY_COLUMNS, ADMIN_MANAGED_COLUMNS, ADMIN_DRIVER_ONLY_MANAGED)
};
}
if (kind === "pending") {
return {
sheet: SHEET_PENDING, idHeader: "Application ID", hasPassword: true, checkUnique: true,
cols: Object.assign({}, ADMIN_TEXT_COLUMNS_COMMON, ADMIN_REGISTRATION_ONLY_COLUMNS)
};
}
throw appError("VALIDATION_FAILED");
}

const ADMIN_ENUMS = {
status: ["Active", "Inactive"],
availability: ["Active", "Inactive"],
emergency: ["TRUE", "FALSE", ""],
sortStatus: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", ""]
};

function adminRecordFields(spec, row) {
const out = {};
Object.keys(spec.cols).forEach((key) => { out[key] = clean(row[spec.cols[key]]); });
return out;
}

function adminFindRow(spec, id) {
const wanted = clean(id);
if (!wanted) throw appError("NOT_FOUND");
const row = readRows(spec.sheet).find((r) => clean(r[spec.idHeader]) === wanted);
if (!row) throw appError("NOT_FOUND");
return row;
}

function adminGetRecord(payload) {
requireAdminMode(payload);
const spec = adminKindSpec(payload.kind);
const row = adminFindRow(spec, payload.id);
return { id: clean(payload.id), kind: payload.kind, fields: adminRecordFields(spec, row) };
}

function writeRowById(sheetName, idHeader, id, updates) {
const s = sheet(sheetName);
const values = s.getDataRange().getValues();
const headers = values[0].map(normHeader);
const idCol = headers.indexOf(idHeader);
if (idCol === -1) throw appError("SHEET_MISCONFIGURED");
for (let i = 1; i < values.length; i++) {
if (clean(values[i][idCol]) === clean(id)) {
writeCells(s, i + 1, headers, updates);
return true;
}
}
return false;
}

function adminSaveRecord(payload) {
const adminCtx = requireAdminMode(payload);
const spec = adminKindSpec(payload.kind);
const id = clean(payload.id);
const row = adminFindRow(spec, id);
const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};

const updates = {};
Object.keys(fields).forEach((key) => {
if (key === "password") return;
const header = spec.cols[key];
if (!header) return;
let value = clean(fields[key]);
if (ADMIN_ENUMS[key] && ADMIN_ENUMS[key].indexOf(value) === -1) throw appError("VALIDATION_FAILED");
if ((key === "starRating" || key === "manualRating") && value !== "") {
const n = Number(value);
if (isNaN(n) || n < 0 || n > 5) throw appError("VALIDATION_FAILED");
}
updates[header] = value;
});

if (spec.hasPassword && fields.password !== undefined && String(fields.password) !== "") {
if (String(fields.password).length < 6) throw appError("VALIDATION_FAILED");
updates["Password"] = hashPassword(String(fields.password));
}

if (spec.checkUnique) {
if (updates["Phone"] !== undefined && !updates["Phone"].replace(/\D/g, "")) throw appError("VALIDATION_FAILED");
if (updates["Username"] !== undefined && !updates["Username"]) throw appError("VALIDATION_FAILED");
if (updates["Name"] !== undefined && !updates["Name"]) throw appError("VALIDATION_FAILED");
adminAssertUnique(spec, id, updates["Phone"], updates["Username"]);
}

if (!Object.keys(updates).length) throw appError("VALIDATION_FAILED");
const historyPairs = [];
Object.keys(updates).forEach((header) => {
if (header === "Password") return;
const oldValue = clean(row[header]);
const newValue = updates[header];
if (oldValue !== newValue) {
historyPairs.push({ oldText: header + ": " + oldValue, newText: header + ": " + newValue });
}
});
if (updates["Password"] !== undefined && updates["Password"].toLowerCase() !== clean(row["Password"]).toLowerCase()) {
historyPairs.push({ oldText: "Password: hidden", newText: "Password: changed" });
}
const targetName = updates["Name"] !== undefined ? updates["Name"] : clean(row["Name"]);

if (!writeRowById(spec.sheet, spec.idHeader, id, updates)) throw appError("NOT_FOUND");
logAdminHistory(adminCtx, historyTargetType(payload.kind), id, targetName, historyPairs);
return { ok: true };
}

const ADMIN_HISTORY_FIXED_HEADERS = ["Date Time", "Admin Driver ID", "Admin Name", "Target Type", "Target ID", "Target Name"];

function historyTargetType(kind) {
return kind === "driver" ? "Driver" : "Pending";
}

function bangladeshTimeText() {
return nowText();
}

function logAdminHistory(adminCtx, targetType, targetId, targetName, pairs) {
try {
if (!pairs || !pairs.length) return;
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let s = ss.getSheetByName(SHEET_ADMIN_HISTORY);
if (!s) {
s = ss.insertSheet(SHEET_ADMIN_HISTORY);
s.getRange(1, 1, 1, ADMIN_HISTORY_FIXED_HEADERS.length).setValues([ADMIN_HISTORY_FIXED_HEADERS]);
}
const needed = ADMIN_HISTORY_FIXED_HEADERS.length + pairs.length * 2;
if (s.getMaxColumns() < needed) s.insertColumnsAfter(s.getMaxColumns(), needed - s.getMaxColumns());

const existing = Math.max(s.getLastColumn(), ADMIN_HISTORY_FIXED_HEADERS.length);
if (existing < needed) {
const extra = [];
for (let c = existing; c < needed; c++) {
const offset = c - ADMIN_HISTORY_FIXED_HEADERS.length;
extra.push((offset % 2 === 0 ? "Old " : "New ") + (Math.floor(offset / 2) + 1));
}
s.getRange(1, existing + 1, 1, extra.length).setValues([extra]);
}

const rowValues = [
bangladeshTimeText(),
clean(adminCtx.driverId),
clean(adminCtx.row["Name"]),
targetType,
clean(targetId),
clean(targetName)
];
pairs.forEach((p) => { rowValues.push(p.oldText, p.newText); });

const rowNum = s.getLastRow() + 1;
if (s.getMaxRows() < rowNum) s.insertRowsAfter(s.getMaxRows(), 500);
s.getRange(rowNum, 1, 1, rowValues.length).setNumberFormat("@").setValues([rowValues]);
} finally {
lock.releaseLock();
}
} catch (err) {
Logger.log("logAdminHistory failed: " + err);
}
}

function adminAssertUnique(spec, selfId, phone, username) {
const phoneDigits = phone !== undefined ? clean(phone).replace(/\D/g, "") : "";
const uname = username !== undefined ? clean(username).toLowerCase() : "";
if (!phoneDigits && !uname) return;
[[SHEET_DRIVERS, "Driver ID"], [SHEET_PENDING, "Application ID"]].forEach((pair) => {
readRows(pair[0]).forEach((r) => {
const isSelf = pair[0] === spec.sheet && clean(r[pair[1]]) === clean(selfId);
if (isSelf) return;
if (phoneDigits && clean(r["Phone"]).replace(/\D/g, "") === phoneDigits) throw appError("DUPLICATE_PHONE");
if (uname && clean(r["Username"]).toLowerCase() === uname) throw appError("DUPLICATE_USERNAME");
});
});
}

function adminListPending(payload) {
requireAdminMode(payload);
const spec = adminKindSpec("pending");
return readRows(SHEET_PENDING).map((r) => ({
applicationId: clean(r["Application ID"]),
status: clean(r["Application Status"]),
submittedDate: dateText(r["Submitted Date"]),
fields: adminRecordFields(spec, r)
}));
}

function nextDriverId() {
const ids = readRows(SHEET_DRIVERS).map((r) => clean(r["Driver ID"]));
let best = null;
ids.forEach((id) => {
const m = /^([A-Za-z\-_]*)(\d+)$/.exec(id);
if (!m) return;
const n = parseInt(m[2], 10);
if (!best || n > best.n) best = { prefix: m[1], n: n, width: m[2].length };
});
if (!best) return "D001";
const next = String(best.n + 1);
return best.prefix + (next.length >= best.width ? next : new Array(best.width - next.length + 1).join("0") + next);
}

function adminCreateRecord(payload) {
const adminCtx = requireAdminMode(payload);
const spec = adminKindSpec("driver");
const fields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};
const row = {};
Object.keys(fields).forEach((key) => {
if (key === "password") return;
const header = spec.cols[key];
if (!header) return;
const value = clean(fields[key]);
if (ADMIN_ENUMS[key] && ADMIN_ENUMS[key].indexOf(value) === -1) throw appError("VALIDATION_FAILED");
if ((key === "starRating" || key === "manualRating") && value !== "") {
const n = Number(value);
if (isNaN(n) || n < 0 || n > 5) throw appError("VALIDATION_FAILED");
}
row[header] = value;
});
if (!row["Name"] || !clean(row["Phone"]).replace(/\D/g, "")) throw appError("VALIDATION_FAILED");
if (fields.password !== undefined && String(fields.password) !== "") {
if (String(fields.password).length < 6) throw appError("VALIDATION_FAILED");
row["Password"] = hashPassword(String(fields.password));
}
const lock = LockService.getScriptLock();
lock.waitLock(20000);
dropRowMemo();
let newId = "";
try {
adminAssertUnique(spec, "", row["Phone"], row["Username"]);
newId = nextDriverId();
const now = nowText();
row["Driver ID"] = newId;
if (!row["Status"]) row["Status"] = "Active";
if (!row["Availability"]) row["Availability"] = "Active";
row["Created Date"] = now;
row["Updated Date"] = now;
appendRow(SHEET_DRIVERS, row);
} finally {
lock.releaseLock();
}
logAdminHistory(adminCtx, historyTargetType("driver"), newId, row["Name"], [
{ oldText: "Status: New", newText: "Created by admin \u2192 Driver ID: " + newId }
]);
return { driverId: newId };
}

function adminApprovePending(payload) {
const adminCtx = requireAdminMode(payload);
const lock = LockService.getScriptLock();
lock.waitLock(20000);
dropRowMemo();
let approvedName = "";
let approvedDriverId = "";
try {
const pendingSpec = adminKindSpec("pending");
const pendingRow = adminFindRow(pendingSpec, payload.id);

if (!clean(pendingRow["Name"]) || !clean(pendingRow["Username"]) || !clean(pendingRow["Password"]) ||
!clean(pendingRow["Phone"]).replace(/\D/g, "")) {
throw appError("VALIDATION_FAILED");
}
const phoneDigits = clean(pendingRow["Phone"]).replace(/\D/g, "");
const uname = clean(pendingRow["Username"]).toLowerCase();
readRows(SHEET_DRIVERS).forEach((r) => {
if (clean(r["Phone"]).replace(/\D/g, "") === phoneDigits) throw appError("DUPLICATE_PHONE");
if (clean(r["Username"]).toLowerCase() === uname) throw appError("DUPLICATE_USERNAME");
});

const carried = [
"Name", "Bengali Name", "Father/Husband Name", "Phone", "Alternative Phone", "WhatsApp", "Village",
"Post Office", "Union", "Upazila", "District", "Full Address", "Vehicle Type", "Vehicle Number", "Bazar",
"Service Area", "Driving Experience", "Driver Image URL", "Vehicle Image URL", "Social Media URL", "Qualification", "Extra 1", "Extra 2", "Extra 3", "Extra 4", "Username", "Password"
];
const now = nowText();
const newRow = {};
carried.forEach((h) => { newRow[h] = clean(pendingRow[h]); });
const driverId = nextDriverId();
newRow["Driver ID"] = driverId;
newRow["Status"] = "Active";
newRow["Availability"] = "Active";
newRow["Created Date"] = now;
newRow["Updated Date"] = now;
appendRow(SHEET_DRIVERS, newRow);

const s = sheet(SHEET_PENDING);
const values = s.getDataRange().getValues();
const headers = values[0].map(normHeader);
const idCol = headers.indexOf("Application ID");
for (let i = 1; i < values.length; i++) {
if (clean(values[i][idCol]) === clean(payload.id)) { s.deleteRow(i + 1); dropRowMemo(); break; }
}
approvedName = clean(pendingRow["Name"]);
approvedDriverId = driverId;
} finally {
lock.releaseLock();
}
logAdminHistory(adminCtx, "Pending", payload.id, approvedName, [
{ oldText: "Status: Pending", newText: "Status: Approved \u2192 Driver ID: " + approvedDriverId }
]);
return { driverId: approvedDriverId };
}

function pendingRatingEntries() {
ensureRatingsSheet();
const values = sheet(SHEET_RATINGS).getDataRange().getValues();
if (values.length < 2) return [];
const headers = values[0].map(normHeader);
const idCol = headers.indexOf("Rating ID");
const typeCol = headers.indexOf("Target Type");
const targetCol = headers.indexOf("Target ID");
const starsCol = headers.indexOf("Star Rating");
const commentCol = headers.indexOf("Comment");
const verifiedCol = headers.indexOf("Verified");
if (targetCol === -1 || verifiedCol === -1) throw appError("SHEET_MISCONFIGURED");
const out = [];
for (let i = 1; i < values.length; i++) {
const row = values[i];
const targetId = clean(row[targetCol]);
if (!targetId) continue;
if (slugOf(row[verifiedCol]) === "true") continue;
const type = typeCol === -1 ? "" : slugOf(row[typeCol]);
if (type && type !== "driver") continue;
const ratingId = idCol === -1 ? "" : clean(row[idCol]);
out.push({
rowNumber: i + 1,
id: ratingId || "row:" + (i + 1),
targetId: targetId,
stars: starsCol === -1 ? 0 : Number(row[starsCol]) || 0,
comment: commentCol === -1 ? "" : clean(row[commentCol]),
verified: clean(row[verifiedCol])
});
}
return out;
}

function adminListPendingRatings(payload) {
requireAdminMode(payload);
const entries = pendingRatingEntries();
const byId = {};
readRows(SHEET_DRIVERS).forEach((r) => { byId[clean(r["Driver ID"])] = r; });
return entries.map((e) => {
const d = byId[e.targetId];
return {
id: e.id,
targetId: e.targetId,
stars: e.stars,
comment: e.comment,
name: d ? clean(d["Name"]) : "",
nameBn: d ? clean(d["Bengali Name"]) : "",
imageUrl: d ? clean(d["Driver Image URL"]) : ""
};
});
}

function adminApproveRating(payload) {
const adminCtx = requireAdminMode(payload);
const id = clean(payload.id);
if (!id) throw appError("VALIDATION_FAILED");
const lock = LockService.getScriptLock();
lock.waitLock(20000);
let entry = null;
let driverName = "";
try {
dropRowMemo();
entry = pendingRatingEntries().find((e) => e.id === id && (id.indexOf("row:") !== 0 || e.targetId === clean(payload.targetId)));
if (!entry) throw appError("NOT_FOUND");
const s = sheet(SHEET_RATINGS);
const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(normHeader);
s.getRange(entry.rowNumber, headers.indexOf("Verified") + 1).setValue("TRUE");
dropRowMemo();
const driverRow = readRows(SHEET_DRIVERS).find((r) => clean(r["Driver ID"]) === entry.targetId);
driverName = driverRow ? clean(driverRow["Name"]) : "";
try {
recalcTargetRating("driver", entry.targetId);
} catch (err) {
Logger.log("recalcTargetRating failed: " + err);
}
} finally {
lock.releaseLock();
}
logAdminHistory(adminCtx, "Rating", entry.id, driverName ? driverName + " (" + entry.targetId + ")" : entry.targetId, [
{ oldText: "Verified: " + (entry.verified ? entry.verified.toUpperCase() : "BLANK"), newText: "Verified: TRUE" }
]);
return { ok: true };
}

function adminPendingCounts(payload) {
requireAdminMode(payload);
return { pendingUsers: readRows(SHEET_PENDING).length, pendingRatings: pendingRatingEntries().length };
}
