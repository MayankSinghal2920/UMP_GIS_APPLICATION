function parseBbox(bbox) {
  if (!bbox) {
    return {
      where: 'shape IS NOT NULL',
      params: []
    };
  }

  const parts = String(bbox).split(',').map(Number);

  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error('Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).');
  }

  return {
    where: `
      shape IS NOT NULL
      AND ST_Intersects(
        shape,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `,
    params: parts
  };
}

module.exports = parseBbox;
