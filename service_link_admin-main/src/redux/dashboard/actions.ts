const dashboardActions = {
  GET_DATA: 'GET_DATA',
  GET_DATA_SUCCESS: 'GET_DATA_SUCCESS',
  GET_DATA_FAILURE: 'GET_DATA_FAILURE',
  SET_LOADING_DATA: 'SET_LOADING_DATA',

  getData: (payload) => {
    return ({
      type: dashboardActions.GET_DATA,
      payload
    })
  },
}

export default dashboardActions;
