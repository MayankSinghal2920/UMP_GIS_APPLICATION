const pool = require('../../../../config/db');

async function getUsersByDivision(divisionCode) {

  const sql = `
    SELECT
      u.objectid,
      u.user_name,
      u.user_type,
      u.unit_type,
      u.zone,
      u.division,
      u.department_id,
      u.hrmsid,
      u.designation
    FROM user_master u
    JOIN div_master d
      ON u.division = d.div_name
    WHERE d.divcode = $1
    ORDER BY u.user_name
  `;

  const result = await pool.query(sql, [divisionCode]);

  return result.rows;
}

module.exports = {
  getUsersByDivision
};