import React, { useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron'; // 用于与 Electron 主进程通信
import { Button, Text } from '@blueprintjs/core'; // UI 按钮和文字组件
import { useTranslation } from 'react-i18next'; //  多语言翻译 hook
import { TFunction } from 'i18next'; //  翻译函数类型定义
import { Col, Row } from 'react-flexbox-grid'; // Flexbox 布局
import ScanQRStep from './ScanQRStep'; // 扫描二维码步骤 UI
import ChooseAppOrScreeenStep from './ChooseAppOrScreeenStep'; // 选择屏幕或应用窗口步骤 UI
import { IpcEvents } from '../../main/IpcEvents.enum'; // 主进程事件定义

// 定义组件的 props 类型（输入参数
interface IntermediateStepProps {
  activeStep: number; // 当前步骤索引
  steps: string[]; // 所有步骤的标签数组
  handleNext: () => void; // 点击“下一步”时触发
  handleBack: () => void; // 点击“上一步”时触发
  handleNextEntireScreen: () => void; // 选择“整个屏幕共享”时触发
  handleNextApplicationWindow: () => void; // 选择“应用窗口共享”时触发
  resetPendingConnectionDevice: () => void; // 重置待连接设备
  resetUserAllowedConnection: () => void; // 重置用户允许的连接状态
  connectedDevice: Device | null; // 当前连接的设备信息（可能为 null）
  handleReset: () => void; // 补充 handleReset 属性
}

// 根据步骤索引返回对应 UI
function getStepContent(
  t: TFunction,
  stepIndex: number,
  handleNextEntireScreen: () => void,
  handleNextApplicationWindow: () => void,
  handleReset: () => void, // 新增参数
  handleTextConnectedListMouseEnter: () => void,
  handleTextConnectedListMouseLeave: () => void
) {
  switch (stepIndex) {
    case 0: // 第 0 步：选择共享模式
      return (
        <>
          <Row center="xs">
            <div style={{ marginBottom: '10px' }}>
              <Text>
                {t('Choose Entire Screen or App window you want to share')}
              </Text>
            </div>
          </Row>
          <ChooseAppOrScreeenStep
            handleNextEntireScreen={handleNextEntireScreen}
            handleNextApplicationWindow={handleNextApplicationWindow}
          />
        </>
      );
    case 1: // Connect 步骤
      return (
        <>
          <ScanQRStep  />
          <Row center="xs" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <Col xs={12}>
              <div
                id="connected-devices-list-text-success"
                onMouseEnter={handleTextConnectedListMouseEnter}
                onMouseLeave={handleTextConnectedListMouseLeave}
                style={{
                  textDecoration: 'underline dotted',
                }}
              >
                <Text className="">
                  {t(
                    'You can manage connected devices by clicking Connected Devices button in top panel'
                  )}
                </Text>
              </div>
            </Col>
          </Row>
          <Button
            intent="primary"
            onClick={handleReset}
            icon="repeat"
            style={{ borderRadius: '100px' }}
          >
            {t('Connect New Device')}
          </Button>
        </>
      );
    default:
      // console.info('---- Unknown stepIndex in IntermediateStep:', stepIndex);
      // return 'Unknown stepIndex';
      return <text>{stepIndex}</text>;
  }
}

// IntermediateStep 主组件
export default function IntermediateStep(props: IntermediateStepProps) {
  const { t } = useTranslation(); // 获取翻译函数 t
  // 从 props 解构出各个属性
  const {
    activeStep,
    handleNextEntireScreen,
    handleNextApplicationWindow,
    resetPendingConnectionDevice,
    resetUserAllowedConnection,
    handleReset,
  } = props;

  // 鼠标进入和离开事件处理
  const handleTextConnectedListMouseEnter = useCallback(() => {
    document
      .querySelector('#top-panel-connected-devices-list-button')
      ?.classList.add('pulsing');
  }, []);

  const handleTextConnectedListMouseLeave = useCallback(() => {
    document
      .querySelector('#top-panel-connected-devices-list-button')
      ?.classList.remove('pulsing');
  }, []);

  // 自动执行确认逻辑
  useEffect(() => {
    if (activeStep === 1) {
      ipcRenderer.invoke(
        IpcEvents.StartSharingOnWaitingForConnectionSharingSession
      );
      resetPendingConnectionDevice();
      resetUserAllowedConnection();
    }
  }, [activeStep, resetPendingConnectionDevice, resetUserAllowedConnection]);

  return (
    <Col
      xs={12}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '260px',
        width: '100%',
      }}
    >
      {/* 根据当前步骤渲染对应的 UI 内容 */}
      {getStepContent(
        t,
        activeStep,
        handleNextEntireScreen,
        handleNextApplicationWindow,
        handleReset,
        handleTextConnectedListMouseEnter,
        handleTextConnectedListMouseLeave
      )}
      {/* 所有按钮都隐藏 */}
    </Col>
  );
}
