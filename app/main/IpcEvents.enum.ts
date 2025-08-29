// eslint-disable-next-line import/prefer-default-export
export enum IpcEvents {
  // 创建等待连接的共享会话
  CreateWaitingForConnectionSharingSession = 'create-waiting-for-connection-sharing-session',
  // 设置待连接设备
  SetPendingConnectionDevice = 'set-pending-connection-device',
  // 将房间ID标记为未占用
  UnmarkRoomIDAsTaken = 'unmark-room-id-as-taken',
  // 获取应用程序路径
  GetAppPath = 'get-app-path',
  // 重置等待连接的共享会话
  ResetWaitingForConnectionSharingSession = 'reset-waiting-for-connection-sharing-session',
  // 设置设备连接状态
  SetDeviceConnectedStatus = 'set-device-connected-status',
  // 通过桌面捕获源ID获取源显示器ID
  GetSourceDisplayIDByDesktopCapturerSourceID = 'get-source-display-id-by-desktop-capturer-source-id',
  // 通过会话ID断开对等端并销毁共享会话
  DisconnectPeerAndDestroySharingSessionBySessionID = 'disconnect-peer-and-destroy-sharing-session-by-session-id',
  // 通过共享会话ID获取桌面捕获源ID
  GetDesktopCapturerSourceIdBySharingSessionId = 'get-desktop-capturer-source-id-by-sharing-session-id',
  // 获取已连接设备列表
  GetConnectedDevices = 'get-connected-devices-list',
  // 通过设备ID断开设备连接
  DisconnectDeviceById = 'disconnect-device-by-id',
  // 断开所有设备连接
  DisconnectAllDevices = 'disconnect-all-devices',
  // 应用程序语言已更改
  AppLanguageChanged = 'app-language-changed',
  // 获取桌面捕获服务源映射表
  GetDesktopCapturerServiceSourcesMap = 'get-desktop-capturer-service-sources-map',
  // 获取等待连接共享会话的源ID
  GetWaitingForConnectionSharingSessionSourceId = 'get-waiting-for-connection-sharing-session-source-id',
  // 在等待连接共享会话上启动共享
  StartSharingOnWaitingForConnectionSharingSession = 'start-sharing-on-waiting-for-connection-sharing-session',
  // 获取待连接设备
  GetPendingConnectionDevice = 'get-pending-connection-device',
  // 获取等待连接共享会话的房间ID
  GetWaitingForConnectionSharingSessionRoomId = 'get-waiting-for-connection-sharing-session-room-id',
  // 获取桌面共享源ID列表
  GetDesktopSharingSourceIds = 'get-desktop-sharing-source-ids',
  // 设置桌面捕获源ID
  SetDesktopCapturerSourceId = 'set-desktop-capturer-source-id',
  // 通知所有会话应用程序主题已更改
  NotifyAllSessionsWithAppThemeChanged = 'notify-all-sessions-with-app-theme-changed',
  // 获取应用程序语言
  GetAppLanguage = 'get-app-language',
  // 获取应用程序是否为首次启动（注：原键名"get-is-not-first-time-app-start"存在语义偏差，实际功能为判断"是否非首次启动"，翻译时保留原意逻辑）
  GetIsFirstTimeAppStart = 'get-is-not-first-time-app-start',
  // 设置应用程序已启动过一次
  SetAppStartedOnce = 'set-app-started-once',
  // 获取应用程序是否为深色主题
  GetIsAppDarkTheme = 'get-is-app-dark-theme',
  // 设置应用程序是否为深色主题
  SetIsAppDarkTheme = 'set-is-app-dark-theme',
  // 通过ID销毁共享会话
  DestroySharingSessionById = 'destroy-sharing-session-by-id',
}