import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components";
import { type Screen } from "../../app/navigation/types";
import { PremiumIcon, type PremiumIconTone } from "../../components/premium/PremiumIcon";
import { chatStyles, noticeStyles } from "../../theme/appStyles";
export type AppNotice = {
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone?: PremiumIconTone;
    actionLabel?: string;
    actionScreen?: Screen;
};
export function AppNoticeSheet({ notice, onClose, onAction }: {
    notice: AppNotice | null;
    onClose: () => void;
    onAction: (screen: Screen) => void;
}) {
    if (!notice)
        return null;
    return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={noticeStyles.sheet}><View style={noticeStyles.hero}><PremiumIcon name={notice.icon} tone={notice.tone ?? 'gold'} size={58} iconSize={27}/><View style={{ flex: 1 }}><Text style={noticeStyles.title}>{notice.title}</Text><Text style={noticeStyles.body}>{notice.body}</Text></View></View><View style={noticeStyles.actions}>{notice.actionLabel && notice.actionScreen ? <Button label={notice.actionLabel} icon="arrow-forward" variant="gold" onPress={() => onAction(notice.actionScreen!)}/> : null}<Button label="Done" variant={notice.actionLabel ? 'secondary' : 'primary'} onPress={onClose}/></View></SafeAreaView></Modal>;
}
