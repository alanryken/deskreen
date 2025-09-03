/* eslint-disable @typescript-eslint/ban-ts-comment */
// React 基础 hook。
import React, { useState, useCallback, useContext, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import { Row, Col, Grid } from 'react-flexbox-grid';
import {
  Button,
  Dialog,
  H1,
  H3,
  H4,
  H5,
  Icon,
  Spinner,
  Text,
} from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useToasts } from 'react-toast-notifications'; // 消息提示框。
//  项目中保存主题设置的 Context。
// import SuccessStep from '../components/StepsOfStepper/SuccessStep'; // 步骤 成功
import IntermediateStep from '../components/StepsOfStepper/IntermediateStep'; // 中间 步骤
import AllowConnectionForDeviceAlert from '../components/AllowConnectionForDeviceAlert';
import DeviceConnectedInfoButton from '../components/StepperPanel/DeviceConnectedInfoButton';
import ColorlibStepIcon, {
  StepIconPropsDeskreen,
} from '../components/StepperPanel/ColorlibStepIcon';
import ColorlibConnector from '../components/StepperPanel/ColorlibConnector';
import { SettingsContext } from './SettingsProvider';
import LanguageSelector from '../components/LanguageSelector';
import { getShuffledArrayOfHello } from '../configs/i18next.config.client';
import ToggleThemeBtnGroup from '../components/ToggleThemeBtnGroup';
// 事件备注
import { IpcEvents } from '../main/IpcEvents.enum';

const Fade = require('react-reveal/Fade'); // 动画效果

// 样式定义
const useStyles = makeStyles(() =>
  createStyles({
    stepContent: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepLabelContent: {
      marginTop: '10px !important',
      height: '110px',
    },
    stepperComponent: {
      paddingBottom: '0px',
    },
  })
);

//  步骤
function getSteps(t: TFunction) {
  return [ t('Select'),t('Connect'),]; // 移除 Confirm
}

//  定义一个 React 组件，允许父组件通过 ref 调用内部方法（比如重置步骤）。
//  eslint-disable-next-line react/display-name
const DeskreenStepper = React.forwardRef((_props, ref) => {
  //  多语言 Hook，t 是翻译函数
  const { t } = useTranslation();

  //  获取样式对象
  const classes = useStyles();

  //  从 SettingsContext 中取出 isDarkTheme（是否黑暗主题）
  const { isDarkTheme } = useContext(SettingsContext);

  //  全局 toast 提示函数
  const { addToast } = useToasts();

  //  ------------------- State 状态定义 -------------------
  const [isAlertOpen, setIsAlertOpen] = useState(false); //  是否打开设备连接确认对话框
  const [isUserAllowedConnection, setIsUserAllowedConnection] = useState(false); //  用户是否允许连接
  const [isNoWiFiError, setisNoWiFiError] = useState(false); //  是否检测到无 WiFi/LAN 错误
  const [isSelectLanguageDialogOpen, setIsSelectLanguageDialogOpen] = useState(
    false
  ); //  是否打开语言选择对话框
  const [isDisplayHelloWord, setIsDisplayHelloWord] = useState(true); //  是否显示问候词（hello word 动画）
  const [helloWord, setHelloWord] = useState('Hello'); //  当前显示的问候词
  const [
    pendingConnectionDevice,
    setPendingConnectionDevice,
  ] = useState<Device | null>(null); //  待确认的连接设备

  //  ------------------- 副作用 useEffect -------------------
  useEffect(() => {
    //  每 1 秒检查一次本机是否有 IP
    const ipInterval = setInterval(async () => {
      const gotIP = await ipcRenderer.invoke('get-local-lan-ip');
      if (gotIP === undefined) {
        setisNoWiFiError(true);
      } else {
        setisNoWiFiError(false);
      }
    }, 1000);
    //  组件卸载时清理定时器
    return () => {
      clearInterval(ipInterval);
    };
  }, []);

  useEffect(() => {
    //  初始化时创建一个等待连接的会话
    ipcRenderer.invoke(IpcEvents.CreateWaitingForConnectionSharingSession);
    //  监听设备请求连接的事件
    ipcRenderer.on(IpcEvents.SetPendingConnectionDevice, (_, device) => {
      setPendingConnectionDevice(device);
      // setIsAlertOpen(true); //  弹出允许连接的确认框
       setIsUserAllowedConnection(true); // 直接允许连接
      // 自动进入下一步
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      ipcRenderer.invoke(IpcEvents.SetDeviceConnectedStatus);
    });
  }, []);

  useEffect(() => {
    //  打开组件时，检查是否是首次启动
    let helloInterval: NodeJS.Timeout;

    async function stepperOpenedCallback() {
      const isFirstTimeStart = await ipcRenderer.invoke(
        IpcEvents.GetIsFirstTimeAppStart
      );
      setIsSelectLanguageDialogOpen(isFirstTimeStart);
      if (!isFirstTimeStart) return;
      //  如果是首次启动，则轮流展示 Hello 单词动画
      const helloWords = getShuffledArrayOfHello();
      let pos = 0;
      helloInterval = setInterval(() => {
        setIsDisplayHelloWord(false);
        if (pos + 1 === helloWords.length) {
          pos = 0;
        } else {
          pos += 1;
        }
        setHelloWord(helloWords[pos]);
        setIsDisplayHelloWord(true);
      }, 4000);
    }

    stepperOpenedCallback();

    return () => {
      clearInterval(helloInterval);
    };
  }, []);

  //  ------------------- Stepper 相关状态 -------------------
  const [activeStep, setActiveStep] = useState(0); //  当前步骤
  const [isEntireScreenSelected, setIsEntireScreenSelected] = useState(false); //  是否选择了整个屏幕
  const [
    isApplicationWindowSelected,
    setIsApplicationWindowSelected,
  ] = useState(false); //  是否选择了某个应用窗口
  const steps = getSteps(t); //  步骤标题数组

  // UI 操作按钮 下一步
  const handleNext = useCallback(() => {
    if (activeStep === steps.length - 1) {
      //  如果是最后一步，重置选择状态
      setIsEntireScreenSelected(false);
      setIsApplicationWindowSelected(false);
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  }, [activeStep, steps]);
  //  下一步：选择整个屏幕
  const handleNextEntireScreen = useCallback(() => {
    setActiveStep(1); // 直接进入 Connect 步骤
    setIsEntireScreenSelected(true);
  }, []);

  //  下一步：选择应用窗口
  const handleNextApplicationWindow = useCallback(() => {
    setActiveStep(1);// 直接进入 Connect 步骤
    setIsApplicationWindowSelected(true);
  }, []);

  // UI 操作按钮 上一步
  const handleBack = useCallback(() => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  }, []);

  // UI 操作按钮 重置
  const handleReset = useCallback(() => {
    setActiveStep(0);

    ipcRenderer.invoke(IpcEvents.CreateWaitingForConnectionSharingSession);
  }, []);

  //  重置步骤，并重新创建连接会话
  const handleResetWithSharingSessionRestart = useCallback(() => {
    setActiveStep(0);
    setPendingConnectionDevice(null);
    setIsUserAllowedConnection(false);

    ipcRenderer.invoke(IpcEvents.ResetWaitingForConnectionSharingSession);
    ipcRenderer.invoke(IpcEvents.CreateWaitingForConnectionSharingSession);
  }, []);

  //  向外暴露方法，父组件可以调用 ref.handleReset()
  React.useImperativeHandle(ref, () => ({
    handleReset() {
      handleResetWithSharingSessionRestart();
    },
  }));
  //  取消连接请求时的处理
  const handleCancelAlert = async () => {
    setIsAlertOpen(false);
    setActiveStep(0);
    setPendingConnectionDevice(null);
    setIsUserAllowedConnection(false);

    ipcRenderer.invoke(IpcEvents.ResetWaitingForConnectionSharingSession);
    ipcRenderer.invoke(IpcEvents.CreateWaitingForConnectionSharingSession);
  };
  //  确认连接请求时的处理
  const handleConfirmAlert = useCallback(async () => {
    setIsAlertOpen(false);
    setIsUserAllowedConnection(true);
    ipcRenderer.invoke(IpcEvents.SetDeviceConnectedStatus);
  }, []);
  //  用户手动断开设备时的处理
  const handleUserClickedDeviceDisconnectButton = useCallback(async () => {
    handleResetWithSharingSessionRestart();

    addToast(
      <Text>
        {t(
          'Device is successfully disconnected by you You can connect a new device'
        )}
      </Text>,
      {
        appearance: 'info',
        autoDismiss: true,
        // @ts-ignore: works fine here
        isdarktheme: `${isDarkTheme}`,
      }
    );
  }, [addToast, handleResetWithSharingSessionRestart, isDarkTheme, t]);
  //  渲染 Step 内容（中间步骤或成功页面）
  const renderIntermediateOrSuccessStepContent = useCallback(() => (
    <div id="intermediate-step-container" style={{ width: '100%' }}>
      <IntermediateStep
        activeStep={activeStep}
        steps={steps}
        handleNext={handleNext}
        handleBack={handleBack}
        handleNextEntireScreen={handleNextEntireScreen}
        handleNextApplicationWindow={handleNextApplicationWindow}
        resetPendingConnectionDevice={() => setPendingConnectionDevice(null)}
        resetUserAllowedConnection={() => setIsUserAllowedConnection(false)}
        connectedDevice={pendingConnectionDevice}
        handleReset={handleReset} // 新增
      />
    </div>
  ), [
    activeStep,
    steps,
    handleReset,
    handleNext,
    handleBack,
    handleNextEntireScreen,
    handleNextApplicationWindow,
    pendingConnectionDevice,
  ]);

  //  渲染 Step 标签（顶部步骤条的 label）
  const renderStepLabelContent = useCallback(
    (label, idx) => {
      return (
        <StepLabel
          id="step-label-deskreen"
          className={classes.stepLabelContent}
          StepIconComponent={ColorlibStepIcon}
          StepIconProps={
            {
              isEntireScreenSelected,
              isApplicationWindowSelected,
            } as StepIconPropsDeskreen
          }
        >
          {pendingConnectionDevice && idx === 0 && isUserAllowedConnection ? (
            <DeviceConnectedInfoButton
              device={pendingConnectionDevice}
              onDisconnect={handleUserClickedDeviceDisconnectButton}
            />
          ) : (
            <Text className="bp3-text-muted">{label}</Text>
          )}
        </StepLabel>
      );
    },
    [
      classes.stepLabelContent,
      handleUserClickedDeviceDisconnectButton,
      isApplicationWindowSelected,
      isEntireScreenSelected,
      isUserAllowedConnection,
      pendingConnectionDevice,
    ]
  );
  //  ------------------- 组件渲染 -------------------
  return (
    <>
      {/* 步骤条 UI */}
      <Row style={{ width: '100%' }}>
        <Col xs={12}>
          <Stepper
            className={classes.stepperComponent}
            activeStep={activeStep}
            alternativeLabel
            style={{ background: 'transparent' }}
            connector={<ColorlibConnector />}
          >
            {steps.map((label, idx) => (
              <Step key={label}>{renderStepLabelContent(label, idx)}</Step>
            ))}
          </Stepper>
        </Col>
        <Col className={classes.stepContent} xs={12}>
          {/* {设置步骤} */}
          {renderIntermediateOrSuccessStepContent()}
        </Col>
      </Row>
      {/* 设备连接确认弹框 */}
      <AllowConnectionForDeviceAlert
        device={pendingConnectionDevice}
        isOpen={isAlertOpen}
        onCancel={handleCancelAlert}
        onConfirm={handleConfirmAlert}
      />
      {/* 无 WiFi 提示弹框 */}
      <Dialog isOpen={isNoWiFiError} autoFocus usePortal>
        <Grid>
          <div style={{ padding: '10px' }}>
            <Row center="xs" style={{ marginTop: '10px' }}>
              <Icon icon="offline" iconSize={50} color="#8A9BA8" />
            </Row>
            <Row center="xs" style={{ marginTop: '10px' }}>
              <H3>No WiFi and LAN connection.</H3>
            </Row>
            <Row center="xs">
              <H5>Deskreen works only with WiFi and LAN networks.</H5>
            </Row>
            <Row center="xs">
              <Spinner size={50} />
            </Row>
            <Row center="xs" style={{ marginTop: '10px' }}>
              <H4>Waiting for connection.</H4>
            </Row>
          </div>
        </Grid>
      </Dialog>
      {/* 首次启动语言选择弹框 */}
      <Dialog isOpen={isSelectLanguageDialogOpen} autoFocus usePortal>
        <Grid>
          <div style={{ padding: '10px' }}>
            <Row center="xs" style={{ marginTop: '10px' }}>
              <Fade collapse opposite when={isDisplayHelloWord} duration={700}>
                <H1>{helloWord}</H1>
              </Fade>
            </Row>
            <Row>
              <Col xs>
                <Row center="xs" style={{ marginTop: '20px' }}>
                  <Icon icon="translate" iconSize={50} color="#8A9BA8" />
                </Row>
                <Row center="xs" style={{ marginTop: '20px' }}>
                  <H5>{t('Language')}</H5>
                </Row>
                <Row center="xs" style={{ marginTop: '10px' }}>
                  <LanguageSelector />
                </Row>
              </Col>
              <Col xs>
                <Row center="xs" style={{ marginTop: '20px' }}>
                  <Icon icon="style" iconSize={50} color="#8A9BA8" />
                </Row>
                <Row center="xs" style={{ marginTop: '20px' }}>
                  <H5>{t('Color Theme')}</H5>
                </Row>
                <Row center="xs" style={{ marginTop: '10px' }}>
                  <ToggleThemeBtnGroup />
                </Row>
              </Col>
            </Row>
            <Row center="xs" style={{ marginTop: '20px' }}>
              <Button
                minimal
                rightIcon="chevron-right"
                onClick={() => {
                  setIsSelectLanguageDialogOpen(false);
                  ipcRenderer.invoke(IpcEvents.SetAppStartedOnce);
                }}
                style={{ borderRadius: '50px' }}
              >
                {t('Continue')}
              </Button>
            </Row>
          </div>
        </Grid>
      </Dialog>
    </>
  );
});

export default DeskreenStepper;
