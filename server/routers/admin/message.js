'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const express_1 = tslib_1.__importDefault(require('express'));
const utils_1 = require('../../utils');
const models_1 = require('../../models');
const router = express_1.default.Router();
const { Sequelize } = require('sequelize');
const {Op} = Sequelize;
router.get('/messages', async function (req, res, next) {
    const {account,createTimeStart,createTimeEnd, modelName} = req.query

    let {page,page_size} = req.query
    
    page = Number(page)
    page_size = Number(page_size)
    //先查出所有user_id
    const whereUser = {
        ...(account && { account: { [Op.like]: `%${account}%` } }),
      };
    const userInfos = await models_1.userModel.getUsersNoLimit(whereUser);
    
    // Initialize an empty array to store user IDs
    const userIdArr = [];
    let modelArr = [];
    if(modelName.length > 0){
      modelArr = modelName.split(',');
    }

    // Iterate through the userInfos array and extract the IDs
    if(userInfos.count > 0){
        userInfos.rows.forEach(userInfo => {
            userIdArr.push(userInfo.id);
        });
    }

    const whereMessage = {
        // Add userIdArr to the where object using Op.in if it's not empty
        ...(userIdArr.length > 0 && {
            user_id: {
              [Op.in]: userIdArr,
            },
          }),
        ...(createTimeStart || createTimeEnd) && {
          create_time: {
            ...(createTimeStart && { [Op.gte]: createTimeStart }),
            ...(createTimeEnd && { [Op.lte]: createTimeEnd }),
          },
        },
        ...(modelArr.length > 0 && {
          model: {
            [Op.in]: modelArr,
          },
        }),
      };

    const messages = await models_1.messageModel.getAdminMessages({ page, page_size }, whereMessage);
    res.json((0, utils_1.httpBody)(0, messages));
});
exports.default = router;
