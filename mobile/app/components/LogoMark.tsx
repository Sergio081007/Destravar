import Svg, {
  Rect, Line, Path, Circle, Ellipse, Defs,
  LinearGradient, RadialGradient, Stop,
} from 'react-native-svg';

type Props = {
  size?: number;
};

export default function LogoMark({ size = 80 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        {/* Fundo azul → roxo */}
        <LinearGradient id="lmBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <Stop offset="0"   stopColor="#0061a2"/>
          <Stop offset="1"   stopColor="#5e41d0"/>
        </LinearGradient>
        {/* Brilho no canto */}
        <RadialGradient id="lmSheen" cx="30%" cy="20%" r="55%">
          <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.2"/>
          <Stop offset="1"   stopColor="#ffffff" stopOpacity="0"/>
        </RadialGradient>
        {/* Corpo do cadeado */}
        <LinearGradient id="lmBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#ffffff"/>
          <Stop offset="1"   stopColor="#eaf2fb"/>
        </LinearGradient>
        {/* Buraco da chave */}
        <LinearGradient id="lmKey" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#9dcaff"/>
          <Stop offset="1"   stopColor="#4da9ff"/>
        </LinearGradient>
        {/* Halo de desbloqueio */}
        <RadialGradient id="lmGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0"   stopColor="#4da9ff" stopOpacity="0.7"/>
          <Stop offset="0.6" stopColor="#4da9ff" stopOpacity="0.2"/>
          <Stop offset="1"   stopColor="#4da9ff" stopOpacity="0"/>
        </RadialGradient>
      </Defs>

      {/* Fundo */}
      <Rect width={512} height={512} rx={112} fill="url(#lmBg)"/>
      <Rect width={512} height={512} rx={112} fill="url(#lmSheen)"/>

      {/* Sombra do cadeado */}
      <Ellipse cx={256} cy={464} rx={116} ry={12} fill="rgba(0,20,60,0.22)"/>

      {/* Gancho — profundidade */}
      <Line x1={176} y1={274} x2={176} y2={168} stroke="rgba(0,50,130,0.14)" strokeWidth={42} strokeLinecap="round"/>
      <Path d="M 176,168 A 80,80 0 0 0 336,168" stroke="rgba(0,50,130,0.14)" strokeWidth={42} strokeLinecap="round" fill="none"/>
      <Line x1={336} y1={168} x2={336} y2={232} stroke="rgba(0,50,130,0.14)" strokeWidth={42} strokeLinecap="round"/>

      {/* Gancho — branco principal */}
      <Line x1={176} y1={274} x2={176} y2={168} stroke="white" strokeWidth={34} strokeLinecap="round"/>
      <Path d="M 176,168 A 80,80 0 0 0 336,168" stroke="white" strokeWidth={34} strokeLinecap="round" fill="none"/>
      <Line x1={336} y1={168} x2={336} y2={232} stroke="white" strokeWidth={34} strokeLinecap="round"/>

      {/* Gancho — reflexo metálico */}
      <Line x1={176} y1={268} x2={176} y2={168} stroke="rgba(255,255,255,0.45)" strokeWidth={12} strokeLinecap="round"/>
      <Path d="M 176,168 A 80,80 0 0 0 336,168" stroke="rgba(255,255,255,0.45)" strokeWidth={12} strokeLinecap="round" fill="none"/>
      <Line x1={336} y1={168} x2={336} y2={232} stroke="rgba(255,255,255,0.45)" strokeWidth={12} strokeLinecap="round"/>

      {/* Corpo do cadeado */}
      <Rect x={108} y={272} width={296} height={180} rx={40} fill="url(#lmBody)"/>

      {/* Faixa superior + divisória */}
      <Rect x={108} y={272} width={296} height={50} rx={40} fill="rgba(0,97,162,0.045)"/>
      <Line x1={134} y1={322} x2={378} y2={322} stroke="rgba(0,97,162,0.09)" strokeWidth={1.5}/>

      {/* Encaixes do gancho */}
      <Circle cx={176} cy={272} r={22} fill="rgba(0,97,162,0.07)"/>
      <Circle cx={336} cy={272} r={22} fill="rgba(0,97,162,0.07)"/>

      {/* Parafusos decorativos */}
      <Circle cx={156} cy={426} r={9}   fill="rgba(0,97,162,0.09)"/>
      <Circle cx={156} cy={426} r={4.5} fill="rgba(0,97,162,0.11)"/>
      <Line x1={151} y1={426} x2={161} y2={426} stroke="rgba(0,97,162,0.08)" strokeWidth={1.2}/>
      <Line x1={156} y1={421} x2={156} y2={431} stroke="rgba(0,97,162,0.08)" strokeWidth={1.2}/>

      <Circle cx={356} cy={426} r={9}   fill="rgba(0,97,162,0.09)"/>
      <Circle cx={356} cy={426} r={4.5} fill="rgba(0,97,162,0.11)"/>
      <Line x1={351} y1={426} x2={361} y2={426} stroke="rgba(0,97,162,0.08)" strokeWidth={1.2}/>
      <Line x1={356} y1={421} x2={356} y2={431} stroke="rgba(0,97,162,0.08)" strokeWidth={1.2}/>

      {/* Buraco da chave */}
      <Circle cx={256} cy={358} r={25} fill="url(#lmKey)" opacity={0.8}/>
      <Rect x={247} y={373} width={18} height={38} rx={7} fill="url(#lmKey)" opacity={0.8}/>

      {/* Halo de desbloqueio no braço solto */}
      <Circle cx={336} cy={232} r={38} fill="url(#lmGlow)"/>
      <Circle cx={336} cy={232} r={15} fill="rgba(255,255,255,0.94)"/>
      <Circle cx={336} cy={232} r={6.5} fill="#4da9ff"/>

      {/* Faíscas de desbloqueio */}
      <Line x1={351} y1={217} x2={364} y2={204} stroke="#4da9ff" strokeWidth={3.5} strokeLinecap="round" opacity={0.8}/>
      <Line x1={358} y1={232} x2={374} y2={232} stroke="#4da9ff" strokeWidth={3.5} strokeLinecap="round" opacity={0.65}/>
      <Line x1={351} y1={247} x2={364} y2={260} stroke="#4da9ff" strokeWidth={3.5} strokeLinecap="round" opacity={0.45}/>
      <Line x1={336} y1={254} x2={336} y2={270} stroke="#4da9ff" strokeWidth={3}   strokeLinecap="round" opacity={0.35}/>
    </Svg>
  );
}
