function allowDepartment(...allowedDepartments) {
  return (req, res, next) => {
    // frontend sends department after login
    const dept =
      req.headers['x-department'] ||
      req.query.department ||
      req.body?.department;

    if (!dept) {
      return res.status(403).json({
        error: 'Department not provided'
      });
    }

    const userDept = String(dept).toUpperCase();

    const allowed = allowedDepartments.map(d => d.toUpperCase());

    if (!allowed.includes(userDept)) {
      return res.status(403).json({
        error: 'Access denied for this department'
      });
    }

    // attach for downstream use
    req.department = userDept;

    next();
  };
}

module.exports = allowDepartment;
