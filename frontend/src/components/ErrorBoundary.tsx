import React, { type ErrorInfo, type ReactNode } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { captureException } from '../lib/telemetry';
import { API_URL } from '../api/config';

type Props = { children: ReactNode };
type State = { failed: boolean; message: string };
const brandLogo = require('../../assets/apnajoda-mark.png');

/**
 * Sends what went wrong to the server log ("[APP CRASH]" in pm2 logs), so a
 * crash on someone's phone can be found. Best effort: never throws.
 */
function reportCrash(error: Error, componentStack: string) {
  try {
    void fetch(`${API_URL}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: Platform.OS,
        version: String(Platform.Version ?? ''),
        message: String(error?.message ?? error).slice(0, 300),
        stack: String(error?.stack ?? '').slice(0, 1500),
        componentStack: componentStack.slice(0, 1500),
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting must never cause a second crash.
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, info.componentStack ?? 'component tree unavailable');
    reportCrash(error, info.componentStack ?? '');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.screen}>
      <Image source={brandLogo} resizeMode="cover" style={styles.mark}/>
      <Text style={styles.title}>A small pause in the story.</Text>
      <Text style={styles.body}>Apnajoda ran into an unexpected problem. Your saved profile and conversations are still safe.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try Apnajoda again" onPress={()=>this.setState({failed:false, message:''})} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
      {!!this.state.message && <Text selectable style={styles.detail}>Error: {this.state.message.slice(0, 200)}</Text>}
    </View>;
  }
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.black,alignItems:'center',justifyContent:'center',padding:28,gap:18},
  mark:{width:72,height:72,borderRadius:18,borderWidth:1,borderColor:'#D3D6DA',shadowColor:colors.pink,shadowOpacity:.5,shadowRadius:12},
  title:{color:colors.ivory,fontSize:26,fontWeight:'700',textAlign:'center'},
  body:{color:colors.muted,fontSize:15,lineHeight:23,textAlign:'center',maxWidth:380},
  button:{marginTop:8,minHeight:52,minWidth:180,borderRadius:radius.pill,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',paddingHorizontal:24},
  buttonText:{color:'#FFFFFF',fontSize:15,fontWeight:'700'},
  detail:{color:colors.muted,fontSize:11,textAlign:'center',maxWidth:380,opacity:.8},
});
