export const USER_STATE_EVENT = 'sota-user-state-updated';

export const dispatchUserStateMutation = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(USER_STATE_EVENT));
};
