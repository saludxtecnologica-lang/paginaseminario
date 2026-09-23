const { getAuthUser, sendJson } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const user = await getAuthUser(req);
  if (!user) {
    return sendJson(res, 200, { authenticated: false, user: null });
  }

  return sendJson(res, 200, {
    authenticated: true,
    user
  });
};
