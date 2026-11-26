import { ElMessage, ElProgress, type MessageHandler } from 'element-plus';
// ElProgress 通过 h() 渲染，不走模板里的按需组件解析，需要手动引入样式
import 'element-plus/es/components/progress/style/css';
import { defineComponent, h, reactive, type PropType } from 'vue';

type ProgressMessageStatus = 'success' | 'exception' | 'warning';
type ProgressMessageType = 'success' | 'warning' | 'info' | 'error';

interface ProgressMessageState {
  title?: string;
  message: string;
  percentage?: number;
  indeterminate?: boolean;
  status?: ProgressMessageStatus;
}

interface ShowProgressMessageOptions extends ProgressMessageState {
  duration?: number;
  showClose?: boolean;
  type?: ProgressMessageType;
}

interface ProgressMessageController {
  close: () => void;
  update: (next: Partial<ProgressMessageState>) => void;
}

const ProgressMessageContent = defineComponent({
  name: 'ProgressMessageContent',
  props: {
    state: {
      required: true,
      type: Object as PropType<ProgressMessageState>,
    },
  },
  setup(props) {
    return () => {
      const children = [];

      if (props.state.title) {
        children.push(
          h(
            'div',
            {
              style: 'font-weight: 600; margin-bottom: 0.375rem;',
            },
            props.state.title,
          ),
        );
      }

      children.push(
        h(
          'div',
          {
            style: 'line-height: 1.5; word-break: break-word;',
          },
          props.state.message,
        ),
      );

      if (props.state.indeterminate || props.state.percentage !== undefined) {
        children.push(
          h(ElProgress, {
            indeterminate: props.state.indeterminate,
            // 不确定进度用固定条宽做来回移动的动画，宽度为 0 时整条不可见
            percentage: props.state.indeterminate ? 40 : props.state.percentage,
            status: props.state.status,
            showText: !props.state.indeterminate,
            strokeWidth: 6,
            style: 'margin-top: 0.625rem; width: 100%;',
          }),
        );
      }

      return h(
        'div',
        {
          style: 'min-width: 18rem; max-width: 24rem;',
        },
        children,
      );
    };
  },
});

export function showProgressMessage(
  options: ShowProgressMessageOptions,
): ProgressMessageController {
  const state = reactive<ProgressMessageState>({
    title: options.title,
    message: options.message,
    percentage: options.percentage,
    indeterminate: options.indeterminate,
    status: options.status,
  });

  const handler: MessageHandler = ElMessage({
    customClass: 'progress-message',
    duration: options.duration ?? 0,
    message: h(ProgressMessageContent, { state }),
    showClose: options.showClose ?? true,
    type: options.type ?? 'info',
  });

  return {
    close() {
      handler.close();
    },
    update(next) {
      Object.assign(state, next);
    },
  };
}
