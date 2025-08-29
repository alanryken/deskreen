/* eslint-disable no-restricted-syntax */
import { Display, ipcMain, BrowserWindow, screen } from 'electron';
import i18n from '../configs/i18next.config';
import ConnectedDevicesService from '../features/ConnectedDevicesService';
import SharingSession from '../features/SharingSessionService/SharingSession';
import RoomIDService from '../server/RoomIDService';
import getDeskreenGlobal from '../utils/mainProcessHelpers/getDeskreenGlobal';
import signalingServer from '../server';
import Logger from '../utils/LoggerWithFilePrefix';
import { IpcEvents } from './IpcEvents.enum';
import SharingSessionStatusEnum from '../features/SharingSessionService/SharingSessionStatusEnum';
import { ElectronStoreKeys } from '../enums/ElectronStoreKeys.enum';
import store from '../deskreen-electron-store';

const log = new Logger(__filename);
const v4IPGetter = require('internal-ip').v4;

export default function initIpcMainHandlers(mainWindow: BrowserWindow) {
  ipcMain.on('client-changed-language', async (_, newLangCode) => {
    // 切换应用语言
    i18n.changeLanguage(newLangCode);
    // 如果已有存储的语言且和新语言相同，就不做额外操作
    if (store.has(ElectronStoreKeys.AppLanguage)) {
      if (store.get(ElectronStoreKeys.AppLanguage) === newLangCode) {
        return;
      }
      // 删除旧的语言设置
      store.delete(ElectronStoreKeys.AppLanguage);
    }
    // 存储新的语言设置
    store.set(ElectronStoreKeys.AppLanguage, newLangCode);
  });

  ipcMain.handle('get-signaling-server-port', () => {
    if (mainWindow === null) return;
    // 把信令服务器端口号发回给渲染进程
    mainWindow.webContents.send('sending-port-from-main', signalingServer.port);
  });

  // 获取全部显示器
  ipcMain.handle('get-all-displays', () => {
    return screen.getAllDisplays();
  });

  // 按显示器 ID 查找对应的屏幕尺寸
  ipcMain.handle('get-display-size-by-display-id', (_, displayID: string) => {
    const display = screen.getAllDisplays().find((d: Display) => {
      return `${d.id}` === displayID;
    });

    if (display) {
      return display.size;
    }
    return undefined;
  });

  // 窗口关闭前的清理逻辑
  ipcMain.handle('main-window-onbeforeunload', () => {
    const deskreenGlobal = getDeskreenGlobal();
    // 连接设备服务
    deskreenGlobal.connectedDevicesService = new ConnectedDevicesService();
    // 房间id 服务
    deskreenGlobal.roomIDService = new RoomIDService();
    // 断开所有共享会话
    deskreenGlobal.sharingSessionService.sharingSessions.forEach(
      (sharingSession: SharingSession) => {
        sharingSession.denyConnectionForPartner();
        sharingSession.destroy();
      }
    );

    // 关闭所有辅助窗口
    deskreenGlobal.rendererWebrtcHelpersService.helpers.forEach(
      (helperWindow) => {
        helperWindow.close();
      }
    );

    // 清理全局状态
    deskreenGlobal.sharingSessionService.waitingForConnectionSharingSession = null;
    deskreenGlobal.rendererWebrtcHelpersService.helpers.clear();
    deskreenGlobal.sharingSessionService.sharingSessions.clear();
  });

  // 获取最新可用版本号
  ipcMain.handle('get-latest-version', () => {
    return getDeskreenGlobal().latestAppVersion;
  });

  // 获取当前应用版本号
  ipcMain.handle('get-current-version', () => {
    return getDeskreenGlobal().currentAppVersion;
  });

  // 获取本机局域网 IP
  ipcMain.handle('get-local-lan-ip', async () => {
    // 在开发或生产模式下返回本机局域网 IP
    if (
      process.env.RUN_MODE === 'dev' ||
      process.env.NODE_ENV === 'production'
    ) {
      const ip = await v4IPGetter();
      return ip;
    }
    return '255.255.255.255';
  });

  // 返回应用安装路径
  ipcMain.handle(IpcEvents.GetAppPath, () => {
    const deskreenGlobal = getDeskreenGlobal();
    return deskreenGlobal.appPath;
  });

  // 取消RoomId已占用的标记
  ipcMain.handle(IpcEvents.UnmarkRoomIDAsTaken, (_, roomID) => {
    const deskreenGlobal = getDeskreenGlobal();
    deskreenGlobal.roomIDService.unmarkRoomIDAsTaken(roomID);
  });

  // 当设备连接时，设置为待确认设备并通知渲染进程
  function onDeviceConnectedCallback(device: Device): void {
    getDeskreenGlobal().connectedDevicesService.setPendingConnectionDevice(
      device
    );
    mainWindow.webContents.send(IpcEvents.SetPendingConnectionDevice, device);
  }

  // 创建一个“等待连接”的共享会话
  ipcMain.handle(IpcEvents.CreateWaitingForConnectionSharingSession, () => {
    getDeskreenGlobal()
      .sharingSessionService.createWaitingForConnectionSharingSession()
      // eslint-disable-next-line promise/always-return
      .then((waitingForConnectionSharingSession) => {
        // 设置设备连接回调
        waitingForConnectionSharingSession.setOnDeviceConnectedCallback(
          onDeviceConnectedCallback
        );
      })
      .catch((e) => log.error(e));
  });

  // 重置等待连接的会话
  ipcMain.handle(IpcEvents.ResetWaitingForConnectionSharingSession, () => {
    const sharingSession = getDeskreenGlobal().sharingSessionService
      .waitingForConnectionSharingSession;
    sharingSession?.disconnectByHostMachineUser();
    sharingSession?.destroy();
    sharingSession?.setStatus(SharingSessionStatusEnum.NOT_CONNECTED);
    getDeskreenGlobal().sharingSessionService.sharingSessions.delete(
      sharingSession?.id as string
    );
    getDeskreenGlobal().sharingSessionService.waitingForConnectionSharingSession = null;
  });

  // 设置设备连接状态
  ipcMain.handle(IpcEvents.SetDeviceConnectedStatus, () => {
    if (
      getDeskreenGlobal().sharingSessionService
        .waitingForConnectionSharingSession !== null
    ) {
      const sharingSession = getDeskreenGlobal().sharingSessionService
        .waitingForConnectionSharingSession;
      sharingSession?.setStatus(SharingSessionStatusEnum.CONNECTED);
    }
  });

  // 通过桌面捕获源ID获取源显示器ID
  ipcMain.handle(
    IpcEvents.GetSourceDisplayIDByDesktopCapturerSourceID,
    (_, sourceId) => {
      return getDeskreenGlobal().desktopCapturerSourcesService.getSourceDisplayIDByDisplayCapturerSourceID(
        sourceId
      );
    }
  );

  // 通过会话ID断开对等端并销毁共享会话
  ipcMain.handle(
    IpcEvents.DisconnectPeerAndDestroySharingSessionBySessionID,
    (_, sessionId) => {
      const sharingSession = getDeskreenGlobal().sharingSessionService.sharingSessions.get(
        sessionId
      );
      if (sharingSession) {
        getDeskreenGlobal().connectedDevicesService.disconnectDeviceByID(
          sharingSession.deviceID
        );
      }
      sharingSession?.disconnectByHostMachineUser();
      sharingSession?.destroy();
      getDeskreenGlobal().sharingSessionService.sharingSessions.delete(
        sessionId
      );
    }
  );

  // 通过共享会话ID获取桌面捕获源ID
  ipcMain.handle(
    IpcEvents.GetDesktopCapturerSourceIdBySharingSessionId,
    (_, sessionId) => {
      return getDeskreenGlobal().sharingSessionService.sharingSessions.get(
        sessionId
      )?.desktopCapturerSourceID;
    }
  );

  // 获取已连接设备列表
  ipcMain.handle(IpcEvents.GetConnectedDevices, () => {
    return getDeskreenGlobal().connectedDevicesService.getDevices();
  });

  // 通过设备ID断开设备连接
  ipcMain.handle(IpcEvents.DisconnectDeviceById, (_, id) => {
    getDeskreenGlobal().connectedDevicesService.disconnectDeviceByID(id);
  });

  // 断开所有设备连接
  ipcMain.handle(IpcEvents.DisconnectAllDevices, () => {
    getDeskreenGlobal().connectedDevicesService.disconnectAllDevices();
  });

  // 应用程序语言已更改
  ipcMain.handle(IpcEvents.AppLanguageChanged, (_, newLang) => {
    if (store.has(ElectronStoreKeys.AppLanguage)) {
      store.delete(ElectronStoreKeys.AppLanguage);
    }
    store.set(ElectronStoreKeys.AppLanguage, newLang);
    getDeskreenGlobal().sharingSessionService.sharingSessions.forEach(
      (sharingSession) => {
        sharingSession?.appLanguageChanged();
      }
    );
  });

  // 获取桌面捕获服务源映射表
  ipcMain.handle(IpcEvents.GetDesktopCapturerServiceSourcesMap, () => {
    const map = getDeskreenGlobal().desktopCapturerSourcesService.getSourcesMap();
    const res = {};
    // eslint-disable-next-line guard-for-in
    for (const key of map.keys()) {
      const source = map.get(key);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      res[key] = {
        source: {
          thumbnail: source?.source.thumbnail?.toDataURL(),
          appIcon: source?.source.appIcon?.toDataURL(),
          name: source?.source.name,
        },
      };
    }
    return res;
  });

  // 获取等待连接共享会话的源ID
  ipcMain.handle(
    IpcEvents.GetWaitingForConnectionSharingSessionSourceId,
    () => {
      return getDeskreenGlobal().sharingSessionService
        .waitingForConnectionSharingSession?.desktopCapturerSourceID;
    }
  );

  // 在等待连接共享会话上启动共享
  ipcMain.handle(
    IpcEvents.StartSharingOnWaitingForConnectionSharingSession,
    () => {
      const sharingSession = getDeskreenGlobal().sharingSessionService
        .waitingForConnectionSharingSession;
      if (sharingSession !== null) {
        sharingSession.callPeer();
        sharingSession.status = SharingSessionStatusEnum.SHARING;
      }
      getDeskreenGlobal().connectedDevicesService.addDevice(
        getDeskreenGlobal().connectedDevicesService.pendingConnectionDevice
      );
      getDeskreenGlobal().connectedDevicesService.resetPendingConnectionDevice();
    }
  );

  // 获取待连接设备
  ipcMain.handle(IpcEvents.GetPendingConnectionDevice, () => {
    return getDeskreenGlobal().connectedDevicesService.pendingConnectionDevice;
  });

  // 获取等待连接共享会话的房间ID
  ipcMain.handle(IpcEvents.GetWaitingForConnectionSharingSessionRoomId, () => {
    if (
      getDeskreenGlobal().sharingSessionService
        .waitingForConnectionSharingSession === null
    ) {
      return undefined;
    }
    return getDeskreenGlobal().sharingSessionService
      .waitingForConnectionSharingSession?.roomID;
  });

  // 获取桌面共享源ID列表
  ipcMain.handle(
    IpcEvents.GetDesktopSharingSourceIds,
    (_, { isEntireScreenToShareChosen }) => {
      if (isEntireScreenToShareChosen === true) {
        return getDeskreenGlobal()
          .desktopCapturerSourcesService.getScreenSources()
          .map((source) => source.id);
      }
      return getDeskreenGlobal()
        .desktopCapturerSourcesService.getAppWindowSources()
        .map((source) => source.id);
    }
  );

  // 设置桌面捕获源ID
  ipcMain.handle(IpcEvents.SetDesktopCapturerSourceId, (_, id) => {
    getDeskreenGlobal().sharingSessionService.waitingForConnectionSharingSession?.setDesktopCapturerSourceID(
      id
    );
  });

  // 通知所有会话应用程序主题已更改
  ipcMain.handle(IpcEvents.NotifyAllSessionsWithAppThemeChanged, () => {
    getDeskreenGlobal().sharingSessionService.sharingSessions.forEach(
      (sharingSession) => {
        sharingSession?.appThemeChanged();
      }
    );
  });

  // 是否首次启动
  ipcMain.handle(IpcEvents.GetIsFirstTimeAppStart, () => {
    if (store.has(ElectronStoreKeys.IsNotFirstTimeAppStart)) {
      return false;
    }
    return true;
  });

  // 设置应用程序已启动过一次
  ipcMain.handle(IpcEvents.SetAppStartedOnce, () => {
    if (store.has(ElectronStoreKeys.IsNotFirstTimeAppStart)) {
      store.delete(ElectronStoreKeys.IsNotFirstTimeAppStart);
    }
    store.set(ElectronStoreKeys.IsNotFirstTimeAppStart, true);
  });

  // 获取应用程序是否为深色主题
  ipcMain.handle(IpcEvents.GetIsAppDarkTheme, () => {
    if (store.has(ElectronStoreKeys.IsAppDarkTheme)) {
      return store.get(ElectronStoreKeys.IsAppDarkTheme);
    }
    return false;
  });

  // 设置应用程序是否为深色主题
  ipcMain.handle(IpcEvents.SetIsAppDarkTheme, (_, isDarkTheme) => {
    if (store.has(ElectronStoreKeys.IsAppDarkTheme)) {
      store.delete(ElectronStoreKeys.IsAppDarkTheme);
    }
    store.set(ElectronStoreKeys.IsAppDarkTheme, isDarkTheme);
  });

  // 获取应用程序语言
  ipcMain.handle(IpcEvents.GetAppLanguage, () => {
    if (store.has(ElectronStoreKeys.AppLanguage)) {
      return store.get(ElectronStoreKeys.AppLanguage);
    }
    return 'en';
  });

  // 通过ID销毁共享会话
  ipcMain.handle(IpcEvents.DestroySharingSessionById, (_, id) => {
    const sharingSession = getDeskreenGlobal().sharingSessionService.sharingSessions.get(
      id
    );
    sharingSession?.setStatus(SharingSessionStatusEnum.DESTROYED);
    sharingSession?.destroy();
    getDeskreenGlobal().sharingSessionService.sharingSessions.delete(id);
  });
}
