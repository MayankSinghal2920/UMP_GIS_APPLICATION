module.exports = {
  landBoundary: {
    table: 'sde.land_boundary',
    idColumn: 'objectid',
    geometryColumn: 'shape'
  },

  landOffset: {
    table: 'sde.land_offset',
    idColumn: 'objectid',
    geometryColumn: 'shape'
  },

  landPlanOnTrack: {
    table: 'sde.land_plan_on_track',
    idColumn: 'objectid',
    geometryColumn: 'shape'
  },

  divisionBuffer: {
    table: 'sde.division_buffer',
    idColumn: 'objectid',
    geometryColumn: 'shape',
    ignoreBbox: true,
    customWhere: 'shape IS NOT NULL'
  }
};
