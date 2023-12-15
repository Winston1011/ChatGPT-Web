"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const db_1 = require("../db");
const mysql_1 = tslib_1.__importDefault(require("./mysql"));
const mysql_2 = tslib_1.__importDefault(require("../user/mysql"));
async function getRoomInfo(where) {
    const find = await mysql_1.default.findOne({
        where
    });
    return find;
}
async function updateRoomInfo(data, where) {
    const update = await mysql_1.default.update(data, {
        where: {
            ...where
        }
    });
    return update;
}

async function addRoom(data) {
    const captains = await mysql_1.default.create(data);
    return captains;
}

async function getRooms(where) {
    mysql_1.default.belongsTo(mysql_2.default, { foreignKey: 'user_id', targetKey: 'id' });
    const find = await mysql_1.default.findAndCountAll({
        where,
        // include: [
        //     {
        //         model: mysql_2.default,
        //         required: false,
        //     }
        // ],
        order: [['create_time', 'DESC']],
    });
    return find;
}

exports.default = {
    getRoomInfo,
    updateRoomInfo,
    addRoom,
    getRooms
};
