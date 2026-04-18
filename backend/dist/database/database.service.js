"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const promise_1 = require("mysql2/promise");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    logger = new common_1.Logger(DatabaseService_1.name);
    baseDir;
    config;
    pool;
    initializationPromise;
    constructor() {
        this.baseDir = this.resolveBaseDir();
        this.config = this.readDatabaseConfig();
        this.ensureUploadDirectories();
    }
    get connectionSummary() {
        return `${this.config.host}:${this.config.port}/${this.config.database}`;
    }
    async onModuleInit() {
        await this.ensureInitialized();
    }
    async ensureReady() {
        await this.ensureInitialized();
        return this.getPool();
    }
    async ping() {
        await this.ensureInitialized();
        const row = await this.queryOne("SELECT 1 AS ok");
        return row?.ok === 1;
    }
    async query(sql, params = []) {
        await this.ensureInitialized();
        return this.createExecutor(await this.getPool()).query(sql, params);
    }
    async queryOne(sql, params = []) {
        await this.ensureInitialized();
        return this.createExecutor(await this.getPool()).queryOne(sql, params);
    }
    async execute(sql, params = []) {
        await this.ensureInitialized();
        return this.createExecutor(await this.getPool()).execute(sql, params);
    }
    async transaction(callback) {
        await this.ensureInitialized();
        const pool = await this.getPool();
        const connection = await pool.getConnection();
        const executor = this.createExecutor(connection);
        try {
            await connection.beginTransaction();
            const result = await callback(executor);
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    async ensureInitialized() {
        if (this.pool) {
            return;
        }
        if (!this.initializationPromise) {
            this.initializationPromise = this.initializeOnce();
        }
        await this.initializationPromise;
    }
    async initializeOnce() {
        try {
            await this.initializeDatabase();
            await this.initializeSchema();
            await this.seedAdminUser();
            await this.seedTestUser();
            this.logger.log(`MySQL initialized at ${this.connectionSummary}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to initialize MySQL database. ${message}`);
            throw error;
        }
    }
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
        }
    }
    async initializeDatabase() {
        const bootstrapConnection = await (0, promise_1.createConnection)({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password,
        });
        try {
            await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS ${this.escapeIdentifier(this.config.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        }
        finally {
            await bootstrapConnection.end();
        }
        this.pool = (0, promise_1.createPool)({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            waitForConnections: true,
            connectionLimit: this.config.connectionLimit,
            charset: "utf8mb4",
            dateStrings: true,
        });
        await this.ping();
    }
    async initializeSchema() {
        const statements = [
            `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          interviews_used INT NOT NULL DEFAULT 0,
          api_key VARCHAR(512) NULL,
          name VARCHAR(255) NULL,
          role VARCHAR(32) NOT NULL DEFAULT 'student',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
            `
        CREATE TABLE IF NOT EXISTS interviews (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          status VARCHAR(32) NOT NULL,
          type VARCHAR(64) NOT NULL,
          difficulty VARCHAR(32) NOT NULL,
          role_name VARCHAR(255) NULL,
          company VARCHAR(255) NULL,
          focus_areas TEXT NULL,
          question_source VARCHAR(32) NULL,
          resume_text LONGTEXT NULL,
          job_description LONGTEXT NULL,
          total_score DOUBLE NULL,
          current_question_index INT NOT NULL DEFAULT 0,
          completed TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_interviews_user_id (user_id),
          CONSTRAINT fk_interviews_user
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
            `
        CREATE TABLE IF NOT EXISTS questions (
          id VARCHAR(36) PRIMARY KEY,
          interview_id VARCHAR(36) NOT NULL,
          question_text TEXT NOT NULL,
          follow_ups_json LONGTEXT NULL,
          order_index INT NOT NULL,
          INDEX idx_questions_interview_order (interview_id, order_index),
          CONSTRAINT fk_questions_interview
            FOREIGN KEY (interview_id) REFERENCES interviews (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
            `
        CREATE TABLE IF NOT EXISTS answers (
          id VARCHAR(36) PRIMARY KEY,
          question_id VARCHAR(36) NOT NULL UNIQUE,
          audio_path VARCHAR(512) NOT NULL,
          video_path VARCHAR(512) NULL,
          transcript LONGTEXT NULL,
          word_timestamps_json LONGTEXT NULL,
          wpm DOUBLE NULL,
          pause_count INT NULL,
          filler_count INT NULL,
          silence_percent DOUBLE NULL,
          duration DOUBLE NULL,
          score DOUBLE NULL,
          feedback LONGTEXT NULL,
          improved_answer LONGTEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_answers_question
            FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
            `
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_password_reset_user_id (user_id),
          CONSTRAINT fk_password_reset_user
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
        ];
        for (const statement of statements) {
            await this.execute(statement);
        }
        await this.ensureColumnExists("answers", "word_timestamps_json", "LONGTEXT NULL");
        await this.ensureColumnExists("answers", "silence_percent", "DOUBLE NULL");
        await this.ensureColumnExists("questions", "follow_ups_json", "LONGTEXT NULL");
        await this.ensureColumnExists("interviews", "role_name", "VARCHAR(255) NULL");
        await this.ensureColumnExists("interviews", "company", "VARCHAR(255) NULL");
        await this.ensureColumnExists("interviews", "focus_areas", "TEXT NULL");
        await this.ensureColumnExists("interviews", "question_source", "VARCHAR(32) NULL");
        await this.ensureColumnExists("users", "security_question", "VARCHAR(255) NULL");
        await this.ensureColumnExists("users", "security_answer_hash", "VARCHAR(255) NULL");
    }
    async seedAdminUser() {
        const email = (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || "Admin123";
        const existing = await this.queryOne("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (existing?.id) {
            return;
        }
        const passwordHash = bcrypt_1.default.hashSync(password, 10);
        await this.execute(`
        INSERT INTO users (id, email, password_hash, interviews_used, api_key, name, role)
        VALUES (?, ?, ?, 0, NULL, ?, 'admin')
      `, [(0, node_crypto_1.randomUUID)(), email, passwordHash, "Local Admin"]);
    }
    async seedTestUser() {
        const email = (process.env.TEST_USER_EMAIL || "test@gmail.com").trim().toLowerCase();
        const password = process.env.TEST_USER_PASSWORD || "test123456";
        const passwordHash = bcrypt_1.default.hashSync(password, 10);
        const existing = await this.queryOne("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
        if (existing?.id) {
            await this.execute(`
          UPDATE users
          SET password_hash = ?, name = COALESCE(name, ?)
          WHERE id = ?
        `, [passwordHash, "System Test User", existing.id]);
            return;
        }
        await this.execute(`
        INSERT INTO users (id, email, password_hash, interviews_used, api_key, name, role)
        VALUES (?, ?, ?, 0, NULL, ?, 'student')
      `, [(0, node_crypto_1.randomUUID)(), email, passwordHash, "System Test User"]);
    }
    async getPool() {
        if (!this.pool) {
            throw new Error("MySQL pool has not been initialized yet.");
        }
        return this.pool;
    }
    async ensureColumnExists(tableName, columnName, definition) {
        const existing = await this.queryOne(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        LIMIT 1
      `, [this.config.database, tableName, columnName]);
        if (existing?.COLUMN_NAME) {
            return;
        }
        await this.execute(`ALTER TABLE ${this.escapeIdentifier(tableName)} ADD COLUMN ${this.escapeIdentifier(columnName)} ${definition}`);
    }
    createExecutor(connection) {
        return {
            execute: async (sql, params = []) => {
                const [result] = await connection.execute(sql, [...params]);
                return result;
            },
            query: async (sql, params = []) => {
                const [rows] = await connection.query(sql, [...params]);
                return rows;
            },
            queryOne: async (sql, params = []) => {
                const rows = await this.createExecutor(connection).query(sql, params);
                return rows[0];
            },
        };
    }
    readDatabaseConfig() {
        const port = Number(process.env.MYSQL_PORT || 3306);
        const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);
        const database = (process.env.MYSQL_DATABASE || "gdg_hackwins").trim();
        if (!Number.isInteger(port) || port <= 0) {
            throw new Error("MYSQL_PORT must be a positive integer.");
        }
        if (!Number.isInteger(connectionLimit) || connectionLimit <= 0) {
            throw new Error("MYSQL_CONNECTION_LIMIT must be a positive integer.");
        }
        if (!/^[A-Za-z0-9_]+$/.test(database)) {
            throw new Error("MYSQL_DATABASE may only contain letters, numbers, and underscores.");
        }
        return {
            host: (process.env.MYSQL_HOST || "127.0.0.1").trim(),
            port,
            user: (process.env.MYSQL_USER || "root").trim(),
            password: process.env.MYSQL_PASSWORD || "",
            database,
            connectionLimit,
        };
    }
    escapeIdentifier(value) {
        return `\`${value}\``;
    }
    resolveBaseDir() {
        const cwd = process.cwd();
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(cwd, "src", "main.ts")) || (0, node_fs_1.existsSync)((0, node_path_1.join)(cwd, "dist", "main.js"))) {
            return cwd;
        }
        const nestedBackend = (0, node_path_1.join)(cwd, "backend");
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(nestedBackend, "src", "main.ts")) ||
            (0, node_fs_1.existsSync)((0, node_path_1.join)(nestedBackend, "dist", "main.js"))) {
            return nestedBackend;
        }
        return cwd;
    }
    ensureUploadDirectories() {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(this.baseDir, "uploads", "audio"), { recursive: true });
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(this.baseDir, "uploads", "video"), { recursive: true });
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DatabaseService);
