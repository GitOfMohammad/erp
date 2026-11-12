const ResponseApi = require('../../core/api/ResponseApi');
const service = require('./auth.service');

async function login(req, res) {
  const result = await service.login(req.validated.body, { ipAddress: req.ip, userAgent: req.get('user-agent') });
  // console.log(result)
  ResponseApi.ok(res, {
    type: 'LOGIN_SUCCESS',
    message: 'ورود موفقیت‌آمیز بود',
    details: result,
  });
}

async function refresh(req, res) {
  const result = await service.refresh(req.validated.body.refreshToken);
   ResponseApi.ok(res, {
    type: 'TOKEN_REFRESHED',
    message: 'توکن‌ها با موفقیت تمدید شدند',
    details: result,
  });
}

async function logout(req, res) {
  await service.logout(req.user.id, req.auth.sid, { username: req.user.username, ipAddress: req.ip, userAgent: req.get('user-agent') });
   ResponseApi.ok(res, {
    type: 'LOGOUT_SUCCESS',
    message: 'از حساب کاربری خارج شدید',
    details: null,
  });
}

async function changePassword(req, res) {
  await service.changePassword(req.user.id, req.validated.body, { username: req.user.username, ipAddress: req.ip, userAgent: req.get('user-agent') });
  ResponseApi.ok(res, {
    type: 'PASSWORD_CHANGED',
    message: 'رمز عبور تغییر کرد؛ برای امنیت، همه نشست‌ها باطل شدند',
    details: null,
  });
}

function me(req, res) {
   ResponseApi.ok(res, {
    type: 'CURRENT_USER',
    message: 'اطلاعات کاربر جاری دریافت شد',
    details: req.user,
  });
}

module.exports = { login, refresh, logout, changePassword, me };
