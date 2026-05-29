import { notification } from 'antd';
const createNotification = (type: string, message: string , description: string = "") => {

  // notification[type]({
  //   message,
  //   description,
  // });
  if (type === 'success' || type === 'warning' || type === "error")
    notification[type]({ message, description });
  // return;
};
export default createNotification;
