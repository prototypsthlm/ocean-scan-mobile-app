import {
  Campaign,
  CreatorApps,
  Feature,
  FeatureType,
  Observation,
} from "../../../models";
import { Thunk } from "../../store";
import {
  addFetchedCampaigns,
  addFetchedFeatureTypes,
  addFetchedObservations,
  addNewFeatureToAdd,
  addNewObservation,
  resetFeaturesToAdd,
  resetFeatureType,
  selectCampaign,
  selectCampaignless,
  selectFeatureType,
} from "./slice";
import { NewFeaturePayload, NewObservationPayload } from "./types";
import { generateUUIDv4 } from "../../../utils";
import { ActionError } from "../../errors/ActionError";

export const fetchCampaigns: Thunk = () => async (
  dispatch,
  getState,
  { api, localStorage }
) => {
  let campaigns: Array<Campaign> = await localStorage.getCampaigns();
  let cursor: string | null = null;

  if (campaigns.length < 1) {
    if (getState().observations.campaignReachedPageEnd) return;

    const result = await api.getCampaigns(
      getState().observations.campaignNextPageCursor
    );
    if (!result.ok || !result.data?.results)
      throw new ActionError("Couldn't get campaigns.");

    campaigns = result.data?.results;
    cursor = result.data?.nextPage;

    await localStorage.saveCampaigns(campaigns);
  }

  dispatch(addFetchedCampaigns({ campaigns, cursor }));
};

export const fetchAllObservations: Thunk = () => async (
  dispatch,
  _,
  { api, localStorage, localDB }
) => {
  localDB.getAllOfflineObservations();
  const observationsEntries: Array<Observation> = await api.mockGETAllObservations();
  const localObservationsEntries: Array<Observation> = await localStorage.getAllQueuedObservations();
  dispatch(
    addFetchedObservations([
      ...observationsEntries,
      ...localObservationsEntries,
    ])
  );
};

export const fetchAllFeatureTypes: Thunk = () => async (
  dispatch,
  _,
  { api, localStorage }
) => {
  let featureTypes: Array<FeatureType> = await localStorage.getFeatureTypes();

  if (featureTypes.length < 1) {
    const result = await api.getAllFeatureTypes();
    if (!result.ok || !result.data?.results)
      throw new ActionError("Couldn't get feature types.");

    featureTypes = result.data?.results;

    await localStorage.saveFeatureTypes(featureTypes);
  }
  dispatch(addFetchedFeatureTypes(featureTypes));
};

export const submitNewObservation: Thunk<NewObservationPayload> = (
  newObservationPayload
) => async (dispatch, getState, { api, localStorage, localDB, navigation }) => {
  const campaignId: string | undefined = getState().observations
    .selectedCampaignEntry?.id;
  const newObservationId: string = generateUUIDv4();
  const newFeatures: Array<Feature> = newObservationPayload.features.map(
    (featurePayload) => ({
      id: generateUUIDv4(),
      creatorId: "CREATOR_ID", // Relation with "creator" (model User)
      creatorApp: CreatorApps.DATA_COLLECTION_APP,
      createdAt: new Date(Date.now()).toISOString(),
      updatedAt: new Date(Date.now()).toISOString(),
      isDeleted: false,
      deletedAt: undefined,

      observationId: newObservationId,
      featureTypeId: featurePayload.feaureType.id,
      imageUrl: featurePayload.imageUrl,

      quantity: featurePayload.quantity,
      quantityUnits: featurePayload.quantityUnits,
      estimatedWeightKg: featurePayload.estimatedWeightKg,
      estimatedSizeM2: featurePayload.estimatedSizeM2,
      estimatedVolumeM3: featurePayload.estimatedVolumeM3,
      depthM: featurePayload.depthM,

      isAbsence: featurePayload.isAbsence,
      isCollected: featurePayload.isCollected,

      comments: featurePayload.comments,
    })
  );
  const newObservation: Observation = {
    id: newObservationId,
    creatorId: "CREATOR_ID", // Relation with "creator" (model User)
    creatorApp: CreatorApps.DATA_COLLECTION_APP,
    createdAt: new Date(Date.now()).toISOString(),
    updatedAt: new Date(Date.now()).toISOString(),
    isDeleted: false,
    deletedAt: undefined,

    campaignId: campaignId || null,
    geometry: newObservationPayload.geometry,
    timestamp: newObservationPayload.timestamp.toISOString(),
    comments: newObservationPayload.comments,
    isMatched: false,
    features: newFeatures,
  };

  const isSuccess: boolean = false; //await api.mockPOSTNewObservation(newObservation);
  if (!isSuccess) await localStorage.queueObservation(newObservation);
  localDB.storeOfflineObservation(newObservation);
  dispatch(addNewObservation(newObservation));
  dispatch(resetFeaturesToAdd());
  navigation.navigate("observationListScreen");
};

export const addNewFeature: Thunk<NewFeaturePayload> = (newFeaturePayload) => (
  dispatch,
  _,
  { navigation }
) => {
  dispatch(addNewFeatureToAdd(newFeaturePayload));
  dispatch(resetFeatureType());
  navigation.navigate("newObservationScreen");
};

export const addFeatureType: Thunk<FeatureType> = (featureTypePayload) => (
  dispatch,
  _,
  { navigation }
) => {
  dispatch(selectFeatureType(featureTypePayload));
  navigation.navigate("newFeatureScreen");
};

export const setSelectedCampaign: Thunk<{
  campaignEntryPayload?: Campaign;
  isCampignless?: boolean;
}> = ({ campaignEntryPayload, isCampignless = false }) => (
  dispatch,
  _,
  { navigation }
) => {
  if (isCampignless) dispatch(selectCampaignless());
  else if (campaignEntryPayload) dispatch(selectCampaign(campaignEntryPayload));
  navigation.navigate("observationListScreen");
};
