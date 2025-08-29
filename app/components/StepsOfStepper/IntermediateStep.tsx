import React from 'react';
import { ipcRenderer } from 'electron'; // 用于与 Electron 主进程通信
import { Button, Text } from '@blueprintjs/core'; // UI 按钮和文字组件
import { useTranslation } from 'react-i18next'; //  多语言翻译 hook
import { TFunction } from 'i18next'; //  翻译函数类型定义
import { Col, Row } from 'react-flexbox-grid'; // Flexbox 布局
import ScanQRStep from './ScanQRStep'; // 扫描二维码步骤 UI
import ChooseAppOrScreeenStep from './ChooseAppOrScreeenStep'; // 选择屏幕或应用窗口步骤 UI
import ConfirmStep from './ConfirmStep'; // 确认连接设备步骤 UI
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
}

// 根据步骤索引返回对应 UI
function getStepContent(
  t: TFunction,
  stepIndex: number,
  handleNextEntireScreen: () => void,
  handleNextApplicationWindow: () => void,
  connectedDevice: Device | null
) {
  switch (stepIndex) {
    case 0: // 第 0 步：展示二维码扫描界面
      return <ScanQRStep />;
    case 1: // 选择共享模式（全屏 or 应用窗口）
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
    case 2:
      return <ConfirmStep device={connectedDevice} />; // 第 2 步：确认设备界面
    default:
      return 'Unknown stepIndex'; // 兜底情况
  }
}
// 判断当前步骤是否为“确认步骤”
function isConfirmStep(activeStep: number, steps: string[]) {
  return activeStep === steps.length - 1;
}
// IntermediateStep 主组件
export default function IntermediateStep(props: IntermediateStepProps) {
  const { t } = useTranslation(); // 获取翻译函数 t
  // 从 props 解构出各个属性
  const {
    activeStep,
    steps,
    handleNext,
    handleBack,
    handleNextEntireScreen,
    handleNextApplicationWindow,
    resetPendingConnectionDevice,
    resetUserAllowedConnection,
    connectedDevice,
  } = props;

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
        connectedDevice
      )}
      {
        // 仅在开发/测试模式下显示一个“连接测试设备”按钮
        // eslint-disable-next-line no-nested-ternary
        process.env.NODE_ENV === 'production' &&
        process.env.RUN_MODE !== 'dev' &&
        process.env.RUN_MODE !== 'test' ? (
          <></>
        ) : activeStep === 0 ? (
          // eslint-disable-next-line react/jsx-indent
          <Button
            onClick={() => {
              // 模拟添加一个测试设备（注释掉了）
              // connectedDevicesService.setPendingConnectionDevice(DEVICES[Math.floor(Math.random() * DEVICES.length)]);
            }}
          >
            Connect Test Device
          </Button>
        ) : (
          <></>
        )
      }
      {/* 只有在第 0 步之后才显示 “下一步/确认” 按钮 */}
      {activeStep !== 0 ? (
        <Row>
          <Col xs={12}>
            <Button
              intent={activeStep === 2 ? 'success' : 'none'} // 第 2 步按钮为绿色
              onClick={async () => {
                handleNext(); // 进入下一步
                if (isConfirmStep(activeStep, steps)) {
                  // 如果是确认步骤，通知主进程开始屏幕共享
                  ipcRenderer.invoke(
                    IpcEvents.StartSharingOnWaitingForConnectionSharingSession
                  );
                  // 清空待连接设备 & 用户连接状态
                  resetPendingConnectionDevice();
                  resetUserAllowedConnection();
                }
              }}
              style={{
                display: activeStep === 1 ? 'none' : 'inline', // 在第 1 步隐藏该按钮
                borderRadius: '100px',
                width: '300px',
                textAlign: 'center',
              }}
              rightIcon={
                isConfirmStep(activeStep, steps)
                  ? 'small-tick' // 确认按钮用 ✅
                  : 'chevron-right' // 普通下一步按钮用 →
              }
            >
              {isConfirmStep(activeStep, steps)
                ? t('Confirm Button Text') // 确认按钮文本
                : 'Next'}
              {/* 普通情况显示 Next */}
            </Button>
          </Col>
        </Row>
      ) : (
        <></>
      )}
      {/* 如果处于确认步骤（第 2 步），显示“返回上一步”按钮 */}
      <Row style={{ display: activeStep === 2 ? 'inline-block' : 'none' }}>
        <Button
          intent="danger" // 红色按钮
          style={{
            marginTop: '10px',
            borderRadius: '100px',
          }}
          onClick={handleBack} // 返回上一步
          icon="chevron-left"
          text={t('No, I need to choose other')} // “不，我要选择其他”
        />
      </Row>
    </Col>
  );
}
