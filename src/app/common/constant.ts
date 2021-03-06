export class Constant {
  public static TOKEN_NAME = 'AUTH_TOKEN';
  public static API_URL = 'http://192.168.0.203:4000/';
  public static SOCKET_URL = 'http://192.168.0.203:4000/';
  public static EMAIL_REG_EX = new RegExp('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$');
  public static PASSWORD_REG_EX = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z!@#$%^&*?.+-\\d]{8,}$');
}
