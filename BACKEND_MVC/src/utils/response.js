function ok(res, data) { return res.json({ status: "success", ...data }); }
function fail(res, message, code=400) { return res.status(code).json({ status: "error", message }); }
module.exports = { ok, fail };
