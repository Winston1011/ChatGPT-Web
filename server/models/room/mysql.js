"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomMysql = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../db");
exports.roomMysql = db_1.sequelizeExample.define('room', {
    room_id: {
        type: sequelize_1.DataTypes.STRING
    },
    status: {
        type: sequelize_1.DataTypes.NUMBER
    },
    title: {
        type: sequelize_1.DataTypes.STRING
    },
    user_id: {
        type: sequelize_1.DataTypes.NUMBER
    },
    create_time: {
        type: sequelize_1.DataTypes.STRING
    },
}, {
    timestamps: false,
    freezeTableName: true
});
exports.default = exports.roomMysql;
