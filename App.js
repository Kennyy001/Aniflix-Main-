import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, Modal, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchAnime, fetchAnimeById, searchAnime } from "./src/anilist";

const C = {
  bg: "#08090D", panel: "#11131A", panel2: "#191C26",
  text: "#F6F7FB", muted: "#9297A6", accent: "#FF5A36",
  line: "#252936", green: "#55D6A3"
};

function Poster({ item, onPress, compact = false }) {
  const image = item?.coverImage?.large || item?.coverImage?.medium;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.posterWrap, compact && { width: 126 }]}>
      <Image source={{ uri: image }} style={[styles.poster, compact && { height: 178 }]} />
      <Text numberOfLines={2} style={styles.posterTitle}>{item?.title?.english || item?.title?.romaji || "Untitled"}</Text>
      <Text style={styles.posterMeta}>{item?.episodes ? `${item.episodes} eps` : item?.format || "Anime"} · {item?.averageScore ? `${item.averageScore}%` : "New"}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, action, children }) {
  return <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
    {children}
  </View>;
}

export default function App() {
  const [tab, setTab] = useState("Home");
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("aniflix.watchlist").then(v => {
      if (v) setWatchlist(JSON.parse(v));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("aniflix.watchlist", JSON.stringify(watchlist)).catch(() => {});
  }, [watchlist]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchAnime("TRENDING"), fetchAnime("POPULARITY_DESC")])
      .then(([a, b]) => {
        if (!alive) return;
        setTrending(a);
        setPopular(b);
        setError("");
      })
      .catch(() => alive && setError("Couldn't load anime. Check your internet and try again."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (tab !== "Discover" || !query.trim()) {
      setResults([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      searchAnime(query.trim()).then(data => alive && setResults(data))
        .catch(() => alive && setResults([]));
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, tab]);

  const openDetails = async (item) => {
    setSelected({ ...item, _loading: true });
    try {
      const full = await fetchAnimeById(item.id);
      setSelected(full);
    } catch {
      setSelected(item);
    }
  };

  const isSaved = (id) => watchlist.some(x => x.id === id);
  const toggleSaved = (item) => {
    setWatchlist(old => old.some(x => x.id === item.id)
      ? old.filter(x => x.id !== item.id)
      : [{ ...item, progress: 0 }, ...old]);
  };
  const updateProgress = (id, delta) => setWatchlist(old => old.map(x => x.id === id
    ? { ...x, progress: Math.max(0, Math.min(x.episodes || 999, (x.progress || 0) + delta)) }
    : x));

  const title = (item) => item?.title?.english || item?.title?.romaji || "Untitled";

  const renderHome = () => <ScrollView showsVerticalScrollIndicator={false}>
    <View style={styles.topBar}>
      <View><Text style={styles.brand}>ANI<Text style={{ color: C.accent }}>FLIX</Text></Text><Text style={styles.tagline}>YOUR ANIME UNIVERSE</Text></View>
      <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
    </View>
    {trending[0] ? <TouchableOpacity onPress={() => openDetails(trending[0])} activeOpacity={0.9} style={styles.hero}>
      <Image source={{ uri: trending[0].bannerImage || trending[0].coverImage?.extraLarge }} style={styles.heroImage}/>
      <View style={styles.heroShade}/>
      <View style={styles.heroContent}>
        <Text style={styles.eyebrow}>FEATURED ANIME</Text>
        <Text style={styles.heroTitle}>{title(trending[0])}</Text>
        <Text style={styles.heroMeta}>{trending[0].format || "ANIME"}  •  {trending[0].seasonYear || " "}</Text>
        <View style={styles.heroButton}><Text style={styles.heroButtonText}>VIEW DETAILS  →</Text></View>
      </View>
    </TouchableOpacity> : null}
    {loading ? <ActivityIndicator color={C.accent} size="large" style={{ margin: 30 }}/> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Section title="Trending now"><ScrollView horizontal showsHorizontalScrollIndicator={false}>{trending.map(x => <Poster key={x.id} item={x} onPress={() => openDetails(x)}/>)}</ScrollView></Section>
    <Section title="Popular anime"><ScrollView horizontal showsHorizontalScrollIndicator={false}>{popular.map(x => <Poster key={x.id} item={x} onPress={() => openDetails(x)}/>)}</ScrollView></Section>
    <View style={{ height: 24 }}/>
  </ScrollView>;

  const renderDiscover = () => <View style={{ flex: 1 }}>
    <Text style={styles.pageTitle}>Discover</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search anime, e.g. One Piece" placeholderTextColor={C.muted} style={styles.search}/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
      {(query.trim() ? results : popular).map(x => <Poster key={x.id} item={x} compact onPress={() => openDetails(x)}/>)}
      {query.trim() && results.length === 0 ? <Text style={styles.empty}>Search for your next favourite anime.</Text> : null}
    </ScrollView>
  </View>;

  const renderWatchlist = () => <ScrollView>
    <Text style={styles.pageTitle}>My Watchlist</Text>
    <Text style={styles.subTitle}>{watchlist.length} saved anime</Text>
    {watchlist.length === 0 ? <View style={styles.emptyBox}><Text style={styles.emptyIcon}>☆</Text><Text style={styles.emptyTitle}>Your list is waiting</Text><Text style={styles.empty}>Save anime from Home or Discover to see them here.</Text></View> :
      watchlist.map(item => <View key={item.id} style={styles.listRow}>
        <TouchableOpacity onPress={() => openDetails(item)}><Image source={{ uri: item.coverImage?.medium }} style={styles.listPoster}/></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle} numberOfLines={2}>{title(item)}</Text>
          <Text style={styles.posterMeta}>{item.progress || 0} / {item.episodes || "?"} episodes</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, ((item.progress || 0) / (item.episodes || 1)) * 100)}%` }]}/></View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
            <TouchableOpacity style={styles.smallButton} onPress={() => updateProgress(item.id, -1)}><Text style={styles.smallButtonText}>−</Text></TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={() => updateProgress(item.id, 1)}><Text style={styles.smallButtonText}>+ EPISODE</Text></TouchableOpacity>
            <TouchableOpacity style={styles.removeButton} onPress={() => toggleSaved(item)}><Text style={styles.removeText}>REMOVE</Text></TouchableOpacity>
          </View>
        </View>
      </View>)
    }
  </ScrollView>;

  const renderProfile = () => <View style={styles.profileWrap}>
    <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>A</Text></View>
    <Text style={styles.profileTitle}>Welcome to ANIFLIX</Text>
    <Text style={styles.empty}>Your anime profile will live here.</Text>
    <View style={styles.profileCard}><Text style={styles.profileCardTitle}>Account sign-in</Text><Text style={styles.empty}>Account creation and cloud sync will be added in the next development step.</Text></View>
    <View style={styles.profileCard}><Text style={styles.profileCardTitle}>Your library</Text><Text style={styles.profileStat}>{watchlist.length} saved titles</Text></View>
  </View>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
    <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 8 }}>
      {tab === "Home" ? renderHome() : tab === "Discover" ? renderDiscover() : tab === "Watchlist" ? renderWatchlist() : renderProfile()}
    </View>
    <View style={styles.nav}>
      {[["Home","⌂"],["Discover","⌕"],["Watchlist","♡"],["Profile","◉"]].map(([label, icon]) =>
        <TouchableOpacity key={label} onPress={() => setTab(label)} style={styles.navItem}>
          <Text style={[styles.navIcon, tab === label && { color: C.accent }]}>{icon}</Text>
          <Text style={[styles.navLabel, tab === label && { color: C.accent }]}>{label}</Text>
        </TouchableOpacity>
      )}
    </View>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
      {selected ? <SafeAreaView style={styles.modal}>
        <ScrollView>
          <View style={styles.detailTop}>
            <Image source={{ uri: selected.bannerImage || selected.coverImage?.extraLarge }} style={styles.detailBanner}/>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.close}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.detailTitle}>{title(selected)}</Text>
            <Text style={styles.detailMeta}>{selected.format || "ANIME"}  •  {selected.episodes || "?"} EPISODES  •  {selected.averageScore ? `${selected.averageScore}% SCORE` : "UNRATED"}</Text>
            <View style={styles.genreRow}>{(selected.genres || []).slice(0, 4).map(g => <Text key={g} style={styles.genre}>{g}</Text>)}</View>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.description}>{(selected.description || "No synopsis available.").replace(/<[^>]*>/g, "")}</Text>
            <TouchableOpacity onPress={() => toggleSaved(selected)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{isSaved(selected.id) ? "✓  REMOVE FROM WATCHLIST" : "+  ADD TO WATCHLIST"}</Text>
            </TouchableOpacity>
            <Text style={styles.sourceNote}>Anime information provided by AniList. ANIFLIX does not host video content.</Text>
          </View>
        </ScrollView>
      </SafeAreaView> : null}
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg}, topBar:{height:62,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  brand:{fontSize:26,fontWeight:"900",letterSpacing:1.5,color:C.text},tagline:{fontSize:8,color:C.muted,letterSpacing:2,marginTop:1},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:C.panel2,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.line},
  avatarText:{color:C.accent,fontWeight:"900"},hero:{height:220,borderRadius:18,overflow:"hidden",marginTop:10,justifyContent:"flex-end",backgroundColor:C.panel},
  heroImage:{...StyleSheet.absoluteFillObject,width:"100%",height:"100%",resizeMode:"cover"},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,0.48)"},
  heroContent:{padding:18},eyebrow:{fontSize:9,color:C.accent,fontWeight:"900",letterSpacing:2},heroTitle:{fontSize:27,color:"white",fontWeight:"900",marginTop:6},heroMeta:{fontSize:10,color:"#D5D7DF",marginTop:5},
  heroButton:{alignSelf:"flex-start",backgroundColor:C.accent,paddingHorizontal:14,paddingVertical:9,borderRadius:7,marginTop:13},heroButtonText:{fontSize:10,color:"white",fontWeight:"900",letterSpacing:1},
  section:{marginTop:25},sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:13},sectionTitle:{fontSize:17,fontWeight:"800",color:C.text},sectionAction:{color:C.accent,fontSize:11},
  posterWrap:{width:132,marginRight:12},poster:{width:"100%",height:190,borderRadius:10,backgroundColor:C.panel2},posterTitle:{color:C.text,fontSize:12,fontWeight:"700",marginTop:8},posterMeta:{color:C.muted,fontSize:10,marginTop:4},
  nav:{height:68,borderTopWidth:1,borderTopColor:C.line,backgroundColor:"#0D0F15",flexDirection:"row",justifyContent:"space-around",alignItems:"center"},
  navItem:{alignItems:"center",justifyContent:"center",minWidth:65},navIcon:{fontSize:22,color:C.muted},navLabel:{fontSize:9,color:C.muted,marginTop:3,fontWeight:"600"},
  pageTitle:{fontSize:27,fontWeight:"900",color:C.text,marginTop:14,marginBottom:14},subTitle:{color:C.muted,fontSize:12,marginTop:-7,marginBottom:18},
  search:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:12,paddingHorizontal:15,paddingVertical:13,color:C.text,fontSize:13,marginBottom:18},
  grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",paddingBottom:20},empty:{color:C.muted,fontSize:12,lineHeight:19},emptyBox:{alignItems:"center",padding:35,backgroundColor:C.panel,borderRadius:16,marginTop:25},
  emptyIcon:{fontSize:42,color:C.accent},emptyTitle:{fontSize:18,fontWeight:"800",color:C.text,marginVertical:10},listRow:{flexDirection:"row",gap:13,paddingVertical:13,borderBottomWidth:1,borderBottomColor:C.line},
  listPoster:{width:78,height:108,borderRadius:9,backgroundColor:C.panel2},listTitle:{fontSize:14,color:C.text,fontWeight:"800",marginBottom:7},progressTrack:{height:4,backgroundColor:C.panel2,borderRadius:4,marginTop:8},progressFill:{height:4,backgroundColor:C.accent,borderRadius:4},
  smallButton:{backgroundColor:C.panel2,borderRadius:6,paddingHorizontal:10,paddingVertical:6},smallButtonText:{color:C.text,fontSize:11,fontWeight:"800"},removeButton:{paddingHorizontal:7,justifyContent:"center"},removeText:{color:C.muted,fontSize:9,fontWeight:"800"},
  profileWrap:{flex:1,alignItems:"center",paddingTop:55},bigAvatar:{width:76,height:76,borderRadius:38,backgroundColor:C.panel2,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.accent},bigAvatarText:{fontSize:30,color:C.accent,fontWeight:"900"},
  profileTitle:{fontSize:21,color:C.text,fontWeight:"900",marginTop:18,marginBottom:7},profileCard:{width:"100%",backgroundColor:C.panel,padding:17,borderRadius:13,marginTop:15,borderWidth:1,borderColor:C.line},profileCardTitle:{color:C.text,fontWeight:"800",fontSize:14,marginBottom:7},profileStat:{color:C.accent,fontSize:22,fontWeight:"900"},
  error:{color:"#FF8B78",fontSize:12,marginTop:10},modal:{flex:1,backgroundColor:C.bg},detailTop:{height:235,backgroundColor:C.panel},detailBanner:{width:"100%",height:"100%",resizeMode:"cover"},close:{position:"absolute",top:12,right:15,width:38,height:38,borderRadius:19,backgroundColor:"rgba(0,0,0,.7)",alignItems:"center",justifyContent:"center"},closeText:{color:"white",fontSize:27},
  detailTitle:{fontSize:25,color:C.text,fontWeight:"900"},detailMeta:{color:C.muted,fontSize:10,letterSpacing:1,marginTop:8},genreRow:{flexDirection:"row",flexWrap:"wrap",gap:7,marginVertical:15},genre:{color:C.accent,backgroundColor:"#291812",paddingHorizontal:10,paddingVertical:6,borderRadius:20,fontSize:10,fontWeight:"700"},
  description:{color:"#C5C8D2",fontSize:13,lineHeight:21,marginTop:10},primaryButton:{backgroundColor:C.accent,padding:15,borderRadius:10,alignItems:"center",marginTop:22},primaryButtonText:{color:"white",fontWeight:"900",fontSize:11,letterSpacing:1},
  sourceNote:{color:C.muted,fontSize:10,lineHeight:16,marginTop:18,marginBottom:30}
});
