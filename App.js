import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import realData from './data';
import CalendarScreen from './CalendarScreen';
import InventoryScreen from './InventoryScreen';
import RoadmapsScreen from './RoadmapsScreen';
import PlacesScreen from './PlacesScreen';
import BuylistScreen from './BuylistScreen';
import TrackerScreen from './TrackerScreen';
import RecipesScreen from './RecipesScreen';
import TodoScreen from './TodoScreen';
import SavingsScreen from './SavingsScreen';
import BodyScreen from './BodyScreen';
import InformationScreen from './InformationScreen';
import BackupScreen from './BackupScreen';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';

const STORAGE_KEY = 'tracker_expo_data_v9';

const NAV_ITEMS = [
  { key: 'tracker', label: 'Tracker', icon: '🎬' },
  { key: 'roadmaps', label: 'Roadmaps', icon: '🚩' },
  { key: 'buylist', label: 'Buylist', icon: '🛍️' },
  { key: 'todo', label: 'To Do', icon: '✅' },
  { key: 'information', label: 'Information', icon: 'ℹ️' },
  { key: 'savings', label: 'Savings', icon: '💰' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'backup', label: 'Backup', icon: '💾' },
];

const TAB_LABELS = {
  tracker: 'Tracker',
  roadmaps: 'Roadmaps',
  buylist: 'Buylist',
  todo: 'To Do',
  information: 'Information',
  savings: 'Savings',
  calendar: 'Calendar',
  recipes: 'Recipes',
  places: 'Places',
  inventory: 'Inventory',
  body: 'Body',
  backup: 'Backup',
};

const DRAWER_WIDTH = 280;

function MainApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('calendar');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [inventory, setInventory] = useState([]);
  const [cards, setCards] = useState([]);
  const [datingPlaces, setDatingPlaces] = useState([]);
  const [travelPlaces, setTravelPlaces] = useState([]);
  const [stats, setStats] = useState([]);
  const [level, setLevel] = useState({ level: 1, xp: 0 });
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardItems, setRewardItems] = useState([]);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [buylist, setBuylist] = useState([]);
  const [buylistCategories, setBuylistCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [todoItems, setTodoItems] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bodyWorkouts, setBodyWorkouts] = useState([]);
  const [bodyRoutines, setBodyRoutines] = useState([]);
  const [bodyInventory, setBodyInventory] = useState([]);
  const [bodyExercises, setBodyExercises] = useState([]);
  const [infoCategories, setInfoCategories] = useState([]);
  const [ingredientLinkMemory, setIngredientLinkMemory] = useState({});
  const [placesKind, setPlacesKind] = useState('dating');
  const [trackerFilter, setTrackerFilter] = useState('all');
  const [buylistFilter, setBuylistFilter] = useState('all');
  const [bodySection, setBodySection] = useState('workouts');
  const [drawerSubmenu, setDrawerSubmenu] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const hasHydrated = useRef(false);

  function drawerSubmenuFor(currentTab) {
    if (currentTab === 'body') {
      return [
        { label: 'Workouts', action: () => setBodySection('workouts') },
        { label: 'Self Care Routines', action: () => setBodySection('routines') },
        { label: 'Self Care Inventory', action: () => setBodySection('inventory') },
      ];
    }
    if (currentTab === 'tracker' && categories.length) {
      return categories.map((c) => ({
        label: c.label,
        action: () => setTrackerFilter(c.id),
      }));
    }
    if (currentTab === 'buylist' && buylistCategories.length) {
      return buylistCategories.map((c) => ({
        label: c.name,
        action: () => setBuylistFilter(c.id),
      }));
    }
    if (currentTab === 'information') {
      return [
        { label: 'Recipes', action: () => handleInfoNavigate('recipes') },
        { label: 'Dating', action: () => handleInfoNavigate('places', 'dating') },
        { label: 'Traveling', action: () => handleInfoNavigate('places', 'traveling') },
        { label: 'Body', action: () => handleInfoNavigate('body') },
      ];
    }
    return null;
  }

  function openDrawer() {
    setDrawerSubmenu(drawerSubmenuFor(tab));
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  function selectTab(key) {
    setTab(key);
    closeDrawer();
  }

  function selectSubmenuItem(item) {
    item.action();
    closeDrawer();
  }

  function getFullPayload() {
    return {
      inventory,
      cards,
      datingPlaces,
      travelPlaces,
      stats,
      level,
      buylist,
      buylistCategories,
      items,
      categories,
      recipes,
      groceries,
      rewardPoints,
      rewardItems,
      rewardHistory,
      todoItems,
      savingsGoals,
      bodyWorkouts,
      bodyRoutines,
      bodyInventory,
      bodyExercises,
      infoCategories,
      ingredientLinkMemory,
    };
  }

  function applyFullPayload(p) {
    setInventory(p.inventory || []);
    setCards(p.cards || []);
    setDatingPlaces(p.datingPlaces || []);
    setTravelPlaces(p.travelPlaces || []);
    setStats(p.stats || []);
    setLevel(p.level || { level: 1, xp: 0 });
    setBuylist(p.buylist || []);
    setBuylistCategories(p.buylistCategories || []);
    setItems(p.items || []);
    setCategories(p.categories || []);
    setRecipes(p.recipes || []);
    setGroceries(p.groceries || []);
    setRewardPoints(p.rewardPoints || 0);
    setRewardItems(p.rewardItems || []);
    setRewardHistory(p.rewardHistory || []);
    setTodoItems(p.todoItems || []);
    setSavingsGoals(p.savingsGoals || []);
    setBodyWorkouts(p.bodyWorkouts || []);
    setBodyRoutines(p.bodyRoutines || []);
    setBodyInventory(p.bodyInventory || []);
    setBodyExercises(p.bodyExercises || []);
    setInfoCategories(p.infoCategories || []);
    setIngredientLinkMemory(p.ingredientLinkMemory || {});
  }

  function handleInfoNavigate(targetTab, kind) {
    if (kind) setPlacesKind(kind);
    setTab(targetTab);
  }

  // Load once on startup: prefer whatever's saved on-device,
  // fall back to the bundled real-data snapshot on first ever run.
  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        setInventory(saved.inventory || realData.inventory || []);
        setCards(saved.cards || realData.cards || []);
        setDatingPlaces(saved.datingPlaces || realData.datingPlaces || []);
        setTravelPlaces(saved.travelPlaces || realData.travelPlaces || []);
        setStats(saved.stats || realData.stats || []);
        setLevel(saved.level || realData.level || { level: 1, xp: 0 });
        setBuylist(saved.buylist || realData.buylist || []);
        setBuylistCategories(
          saved.buylistCategories || realData.buylistCategories || []
        );
        setItems(saved.items || realData.items || []);
        setCategories(saved.categories || realData.categories || []);
        setRecipes(saved.recipes || realData.recipes || []);
        setGroceries(saved.groceries || realData.groceries || []);
        setRewardPoints(
          saved.rewardPoints != null ? saved.rewardPoints : realData.rewards?.points || 0
        );
        setRewardItems(saved.rewardItems || realData.rewards?.items || []);
        setRewardHistory(saved.rewardHistory || realData.rewards?.history || []);
        setTodoItems(saved.todoItems || realData.todoItems || []);
        setSavingsGoals(saved.savingsGoals || realData.savings || []);
        setBodyWorkouts(saved.bodyWorkouts || realData.bodyWorkouts || []);
        setBodyRoutines(saved.bodyRoutines || realData.bodyRoutines || []);
        setBodyInventory(saved.bodyInventory || realData.bodyInventory || []);
        setBodyExercises(saved.bodyExercises || realData.bodyExercises || []);
        setInfoCategories(saved.infoCategories || realData.infoCategories || []);
        setIngredientLinkMemory(
          saved.ingredientLinkMemory || realData.ingredientLinkMemory || {}
        );
      } catch (e) {
        setInventory(realData.inventory || []);
        setCards(realData.cards || []);
        setDatingPlaces(realData.datingPlaces || []);
        setTravelPlaces(realData.travelPlaces || []);
        setStats(realData.stats || []);
        setLevel(realData.level || { level: 1, xp: 0 });
        setBuylist(realData.buylist || []);
        setBuylistCategories(realData.buylistCategories || []);
        setItems(realData.items || []);
        setCategories(realData.categories || []);
        setRecipes(realData.recipes || []);
        setGroceries(realData.groceries || []);
        setRewardPoints(realData.rewards?.points || 0);
        setRewardItems(realData.rewards?.items || []);
        setRewardHistory(realData.rewards?.history || []);
        setTodoItems(realData.todoItems || []);
        setSavingsGoals(realData.savings || []);
        setBodyWorkouts(realData.bodyWorkouts || []);
        setBodyRoutines(realData.bodyRoutines || []);
        setBodyInventory(realData.bodyInventory || []);
        setBodyExercises(realData.bodyExercises || []);
        setInfoCategories(realData.infoCategories || []);
        setIngredientLinkMemory(realData.ingredientLinkMemory || {});
      } finally {
        hasHydrated.current = true;
        setLoaded(true);
      }
    }
    load();
  }, []);

  // Auto-save on every change, once initial load is done
  // (so we don't immediately overwrite saved data with empty state).
  useEffect(() => {
    if (!hasHydrated.current) return;
    const payload = {
      inventory,
      cards,
      datingPlaces,
      travelPlaces,
      stats,
      level,
      buylist,
      buylistCategories,
      items,
      categories,
      recipes,
      groceries,
      rewardPoints,
      rewardItems,
      rewardHistory,
      todoItems,
      savingsGoals,
      bodyWorkouts,
      bodyRoutines,
      bodyInventory,
      bodyExercises,
      infoCategories,
      ingredientLinkMemory,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [
    inventory,
    cards,
    datingPlaces,
    travelPlaces,
    stats,
    level,
    buylist,
    buylistCategories,
    items,
    categories,
    recipes,
    groceries,
    rewardPoints,
    rewardItems,
    rewardHistory,
    todoItems,
    savingsGoals,
    bodyWorkouts,
    bodyRoutines,
    bodyInventory,
    bodyExercises,
    infoCategories,
    ingredientLinkMemory,
  ]);

  const data = { inventory, cards, datingPlaces };

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: DIM }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const activeLabel = TAB_LABELS[tab] || 'Tracker';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'calendar' && <CalendarScreen data={data} />}
        {tab === 'roadmaps' && (
          <RoadmapsScreen
            cards={cards}
            setCards={setCards}
            stats={stats}
            setStats={setStats}
            level={level}
            setLevel={setLevel}
            rewardPoints={rewardPoints}
            setRewardPoints={setRewardPoints}
            rewardItems={rewardItems}
            setRewardItems={setRewardItems}
            rewardHistory={rewardHistory}
            setRewardHistory={setRewardHistory}
          />
        )}
        {tab === 'places' && (
          <PlacesScreen
            datingPlaces={datingPlaces}
            setDatingPlaces={setDatingPlaces}
            travelPlaces={travelPlaces}
            setTravelPlaces={setTravelPlaces}
            initialKind={placesKind}
          />
        )}
        {tab === 'buylist' && (
          <BuylistScreen
            buylist={buylist}
            setBuylist={setBuylist}
            buylistCategories={buylistCategories}
            setBuylistCategories={setBuylistCategories}
            initialFilter={buylistFilter}
          />
        )}
        {tab === 'tracker' && (
          <TrackerScreen
            items={items}
            setItems={setItems}
            categories={categories}
            setCategories={setCategories}
            initialFilter={trackerFilter}
          />
        )}
        {tab === 'recipes' && (
          <RecipesScreen
            recipes={recipes}
            setRecipes={setRecipes}
            groceries={groceries}
            setGroceries={setGroceries}
            inventory={inventory}
            setInventory={setInventory}
            ingredientLinkMemory={ingredientLinkMemory}
            setIngredientLinkMemory={setIngredientLinkMemory}
          />
        )}
        {tab === 'inventory' && (
          <InventoryScreen inventory={inventory} setInventory={setInventory} />
        )}
        {tab === 'todo' && (
          <TodoScreen todoItems={todoItems} setTodoItems={setTodoItems} />
        )}
        {tab === 'savings' && (
          <SavingsScreen savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} />
        )}
        {tab === 'body' && (
          <BodyScreen
            bodyWorkouts={bodyWorkouts}
            setBodyWorkouts={setBodyWorkouts}
            bodyRoutines={bodyRoutines}
            setBodyRoutines={setBodyRoutines}
            bodyInventory={bodyInventory}
            setBodyInventory={setBodyInventory}
            bodyExercises={bodyExercises}
            setBodyExercises={setBodyExercises}
            initialSection={bodySection}
          />
        )}
        {tab === 'information' && (
          <InformationScreen
            infoCategories={infoCategories}
            setInfoCategories={setInfoCategories}
            onNavigate={handleInfoNavigate}
          />
        )}
        {tab === 'backup' && (
          <BackupScreen getPayload={getFullPayload} applyPayload={applyFullPayload} />
        )}
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View
            style={[
              styles.drawer,
              { paddingTop: insets.top + 20, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <Text style={styles.drawerTitle}>TRACKER</Text>
            {drawerSubmenu ? (
              <>
                <TouchableOpacity
                  style={styles.drawerBackRow}
                  onPress={() => setDrawerSubmenu(null)}
                >
                  <Text style={styles.drawerBackText}>← Main Menu</Text>
                </TouchableOpacity>
                <Text style={styles.drawerSubHeader}>{TAB_LABELS[tab]}</Text>
                {drawerSubmenu.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.drawerItem}
                    onPress={() => selectSubmenuItem(item)}
                  >
                    <Text style={styles.drawerLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.drawerItem,
                    tab === item.key && styles.drawerItemSel,
                  ]}
                  onPress={() => selectTab(item.key)}
                >
                  <Text style={styles.drawerIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.drawerLabel,
                      tab === item.key && styles.drawerLabelSel,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eaf2fb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 8,
    height: 52,
  },
  hamburgerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hamburgerIcon: { fontSize: 22, color: INK },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#1c2b3a',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 24,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  drawerItemSel: {},
  drawerIcon: { fontSize: 18, marginRight: 14, width: 22, textAlign: 'center' },
  drawerLabel: { color: '#c7d0da', fontSize: 16, fontWeight: '500' },
  drawerLabelSel: { color: GOLD, fontWeight: '700' },
  drawerBackRow: { paddingVertical: 10, marginBottom: 4 },
  drawerBackText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  drawerSubHeader: {
    color: '#7d8ea1',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});

