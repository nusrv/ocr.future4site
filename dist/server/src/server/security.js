"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashApiKey = exports.verifyPassword = exports.hashPassword = void 0;
exports.signSession = signSession;
exports.verifySession = verifySession;
exports.issueApiKey = issueApiKey;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const hashPassword = (password) => bcryptjs_1.default.hash(password, 12);
exports.hashPassword = hashPassword;
const verifyPassword = (password, hash) => bcryptjs_1.default.compare(password, hash);
exports.verifyPassword = verifyPassword;
function signSession(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.config.JWT_SECRET, { expiresIn: '12h', issuer: 'future-ocr', audience: 'future-ocr-web' });
}
function verifySession(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET, { issuer: 'future-ocr', audience: 'future-ocr-web' });
}
function issueApiKey() {
    const secret = `focr_${(0, node_crypto_1.randomBytes)(30).toString('base64url')}`;
    return { secret, prefix: secret.slice(0, 12), hash: (0, exports.hashApiKey)(secret) };
}
const hashApiKey = (key) => (0, node_crypto_1.createHash)('sha256').update(key).digest('hex');
exports.hashApiKey = hashApiKey;
