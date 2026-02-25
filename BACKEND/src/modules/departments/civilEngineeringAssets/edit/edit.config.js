module.exports = {
  station: {
    table: 'sde.station',
    idColumn: 'objectid',
    idStrategy: 'manual', // manual MAX()+1 for now

    geometry: {
      enabled: true,
      type: 'Point',
      column: 'shape',
      xField: 'xcoord',
      yField: 'ycoord'
    },

    insertFields: [
      'sttncode',
      'sttnname',
      'sttntype',
      'distkm',
      'distm',
      'state',
      'district',
      'constituncy',
      'latitude',
      'longitude',
      'xcoord',
      'ycoord',
      'railway',
      'category'
    ],

    updateFields: [
      'distkm',
      'distm',
      'state',
      'district',
      'constituncy',
      'sttnname',
      'category',
      'sttntype'
    ],

    searchableFields: [
      'sttncode',
      'state',
      'district'
    ]
  }
};
