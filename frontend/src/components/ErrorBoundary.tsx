import React, { type ErrorInfo, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { captureException } from '../lib/telemetry';

type Props = { children: ReactNode };
type State = { failed: boolean };
const brandLogo = require('../../assets/apnajoda-mark.png');

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, info.componentStack ?? 'component tree unavailable');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.screen}>
      <Image source={brandLogo} resizeMode="cover" style={styles.mark}/>
      <Text style={styles.title}>A small pause in the story.</Text>
      <Text style={styles.body}>Apnajoda ran into an unexpected problem. Your saved profile and conversations are still safe.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try Apnajoda again" onPress={()=>this.setState({failed:false})} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>;
  }
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.black,alignItems:'center',justifyContent:'center',padding:28,gap:18},
  mark:{width:72,height:72,borderRadius:18,borderWidth:1,borderColor:'#D3D6DA',shadowColor:colors.pink,shadowOpacity:.5,shadowRadius:12},
  title:{color:colors.ivory,fontSize:26,fontWeight:'700',textAlign:'center'},
  body:{color:colors.muted,fontSize:15,lineHeight:23,textAlign:'center',maxWidth:380},
  button:{marginTop:8,minHeight:52,minWidth:180,borderRadius:radius.pill,backgroundColor:colors.pink,alignItems:'center',justifyContent:'center',paddingHorizontal:24},
  buttonText:{color:colors.ivory,fontSize:15,fontWeight:'700'},
});
