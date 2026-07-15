"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.rows = rows;
exports.transaction = transaction;
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = require("./config");
exports.db = promise_1.default.createPool({
    uri: config_1.config.DATABASE_URL,
    connectionLimit: 10,
    enableKeepAlive: true,
    charset: 'utf8mb4'
});
async function rows(sql, params = []) {
    const [result] = await exports.db.query(sql, params);
    return result;
}
async function transaction(fn) {
    const connection = await exports.db.getConnection();
    try {
        await connection.beginTransaction();
        const value = await fn(connection);
        await connection.commit();
        return value;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
