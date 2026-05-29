import { notification } from "antd";
export const notificationComponent = (
  type: string,
  time: number,
  title: string,
  content: string
): void => {
  if (type === "success" || type === "warning" || type === "error") {
    notification[type]({
      duration: time,
      message: title,
      description: content,
    });
  }
};
