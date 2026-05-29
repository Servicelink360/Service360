export interface SelectComponentProps {
  handleChange: (data: string, text?: any) => void;
  text?: string;
  list: SelectProps[];
}
export interface InputComponentProps {
  handleChangeInput: (data: any) => void;
  text: string;
  value: string;
}
export interface ButtonComponentProps {
  text: string;
  style?: any;
  handleOnClick: (data: string) => void;
}
export interface ColumnProps {
  title: string;
  dataIndex: string;
  width?: number;
  fixed?: string;
  render?: any;
}
export interface DatePickerComponentProps {
  style: any;
  onChangeDate: (date: any, dateTime: string[]) => void;
}
export interface PaginationComponentProps {
  style: any;
  page: number;
  onChangePage: (page: number) => void;
}
export interface ImageProps {
  style?: any;
  src: string;
  alt: string;
}
export interface ModalUsersProps {
  modal: boolean
  title: string
  objUserUpdate: any;
  handleChangeForm: () => void;
  message_api: any;
  changeForm: boolean;
  list: SelectProps[]
  resetObjectUpdate: () => void;
  language: SelectProps[];
  gender: SelectProps[];
  name: string;
  handleModalUsers: (data: boolean) => void
}
export interface SelectProps {
  key: string;
  value: string;
}
export interface ExportCSVProps {
  handleCallApiExcel: () => void;
  csvData: any;
  fileName: string;
}
export interface ObjectParamsProps<T> {
  id: T;
  keyword: T; 
  status: T;
  page : T;
  limit : T;
  startDate: T;
  endDate: T;
  type: any;
}
export interface UsersReducersProps {
  loading: boolean;
  data: any[];
  message_delete: any;
  count: number;
  status_list: SelectProps[];
  status_list_Search: any[];
  modal: boolean;
  basic_list: any[];
  limit: number;
  message_api: any;
  basic_by_type: any[];
  excel: any[];
  gender: SelectProps[];
  language: SelectProps[];
  page: number;
  username_list: string[];
  roles: any;
  loadingAction: boolean;
  isSuccess: boolean;
  roleModal: boolean;
  rolesUser: any;
  menuGroup: SelectProps[];  
  Type: any[];
  success: boolean,
  statusModal: boolean
}