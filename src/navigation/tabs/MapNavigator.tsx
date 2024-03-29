import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ObservationMapScreen from "../../screens/LoggedIn/Map/ObservationMapScreen";
import LogoutButton from "../../components/LogoutButton";
import ObservationDetailScreen from "../../screens/LoggedIn/List/ObservationDetailScreen";
import SettingsHelperButton from "../../components/SettingsHelperButton";

const Stack = createStackNavigator();

export default function MapNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="observationMapScreen"
        component={ObservationMapScreen}
        options={{ 
          headerTitle: "Observations map", 
          headerRight: LogoutButton,
          headerLeft: SettingsHelperButton
        }}
      />
      <Stack.Screen
        name="observationDetailScreen"
        component={ObservationDetailScreen}
        options={{ headerTitle: "Observation details" }}
      />
    </Stack.Navigator>
  );
}
