/**
 * React Native's Modal, plus the phone's back button on the website: back
 * closes the popup (the same as its X) instead of leaving the screen.
 * The phone app already gets this from onRequestClose.
 *
 * Use it everywhere in place of Modal from react-native.
 */
import { Modal as RNModal, type ModalProps } from "react-native";

import { useBackToClose } from "../app/navigation/useBackToClose";

export function Modal(props: ModalProps) {
  const { visible = true, onRequestClose } = props;
  useBackToClose(!!visible && !!onRequestClose, () => onRequestClose?.({} as never));
  return <RNModal {...props} />;
}
