// import Uppy from 'uppy/lib/core';
// import Dashboard from 'uppy/lib/plugins/Dashboard';
// import GoogleDrive from 'uppy/lib/plugins/GoogleDrive';
// import Dropbox from 'uppy/lib/plugins/Dropbox';
// import Instagram from 'uppy/lib/plugins/Instagram';
// import Webcam from 'uppy/lib/plugins/Webcam';
// import Tus10 from 'uppy/lib/plugins/Tus10';
// import MetaData from 'uppy/lib/plugins/MetaData';
const Uppy = require('uppy/lib/core');
const Dashboard = require('uppy/lib/plugins/Dashboard');
const GoogleDrive = require('uppy/lib/plugins/GoogleDrive');
const Dropbox = require('uppy/lib/plugins/Dropbox');
const Instagram = require('uppy/lib/plugins/Instagram');
const Webcam = require('uppy/lib/plugins/Webcam');
const Tus10 = require('uppy/lib/plugins/Tus10');
const MetaData = require('uppy/lib/plugins/MetaData');
const SERVER = null;

export default function uppyInit(options: any, onSuccess: any) {
  const uppy = Uppy({
    debug: true,
    autoProceed: options.autoProceed,
    restrictions: options.restrictions || '',
  });
  uppy.use(Tus10, { endpoint: options.endpoint, resume: true });
  uppy.use(Dashboard, {
    trigger: options.trigger,
    inline: options.DashboardInline,
    target: options.target,
    note: options.restrictions || 'Images and video only, 300kb or less',
  });
  if (options.GoogleDrive) {
    uppy.use(GoogleDrive, { target: Dashboard, host: SERVER });
  }
  if (options.Dropbox) {
    uppy.use(Dropbox, { target: Dashboard, host: SERVER });
  }
  if (options.Instagram) {
    uppy.use(Instagram, { target: Dashboard, host: SERVER });
  }
  if (options.Webcam) {
    uppy.use(Webcam, { target: Dashboard });
  }
  uppy.use(MetaData, {
    fields: options.metaFields || [],
  });
  uppy.on('core:success', (fileList: any) => {
    onSuccess(fileList);
  });
  uppy.run();
}
