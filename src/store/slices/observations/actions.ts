import {
  CreatorApps,
  //FeatureImage,
  Measurement,
  Observation,
  ObservationImage,
} from "../../../models";
import { Thunk } from "../../store";
import {
  addEditedObservation,
  addFetchedObservations,
  addFetchedObservationImages,
  addNewObservation,
  resetPagination,
  selectObservation,
  setFetchedObservations,
  setObservationCursor,
  setRefreshing,
} from "./slice";
import { EditObservationPayload, NewObservationPayload } from "./types";
import { generateUUIDv4 } from "../../../utils";
import { ActionError } from "../../errors/ActionError";
import { EntityType } from "../../../services/localDB/types";
import {
  //fetchCachedFeatureImages,
  //processSubmitFeatureImages,
  processSubmitObservationImages,
  processSubmitMeasurements,
  resetMeasurementsToAdd,
  resetPagination as resetFeaturePagination,
} from "../measurements";

export const fetchObservations: Thunk<{ forceRefresh?: boolean }> = (
  options
) => async (dispatch, getState, { api, localDB }) => {
  try {
    if (getState().observations.refreshing) return;
    dispatch(setRefreshing(true));
    const { forceRefresh } = options;
    const refresh: boolean = forceRefresh || false;
    if (
      (refresh || !getState().observations.reachedPageEnd) &&
      getState().ui.isOnline
    ) {
      if (refresh && getState().observations.reachedPageEnd)
        dispatch(resetPagination());

      // 1. Get next page
      const campaignId: string | null =
        getState().campaigns.selectedCampaignEntry?.id || null;
      const nextPage: string | null = getState().observations.nextPageCursor;
      const response = await api.getObservations(campaignId, nextPage);

      if (!response.ok || !response.data?.results)
        throw new ActionError("Couldn't get observations.");

      const observationsEntries: Array<Observation> = response.data.results;
      const cursor: string | null = response.data?.nextPage;

      // 2. Upsert to localDB
      if (observationsEntries.length > 0)
        await localDB.upsertEntities(
          observationsEntries,
          EntityType.Observation,
          true,
          campaignId
        );

      dispatch(setObservationCursor(cursor));
      dispatch(addFetchedObservations(observationsEntries));
    }

    if (!getState().ui.isOnline) {
      dispatch(fetchCachedObservations());
    }

    dispatch(setRefreshing(false));
  } catch (e) {
    console.log({ e });
    dispatch(setRefreshing(false));
  }
};

export const fetchCachedObservations: Thunk = () => async (
  dispatch,
  getState,
  { localDB }
) => {
  try {
    const campaignId: string | null =
      getState().campaigns.selectedCampaignEntry?.id || null;
    const observationEntries: Array<Observation> = await localDB.getEntities<Observation>(
      EntityType.Observation,
      null,
      campaignId
    );
    dispatch(setFetchedObservations(observationEntries));
  } catch (e) {
    console.log({ e });
  }
};

export const fetchCachedObservationImages: Thunk = () => async (
  dispatch,
  _,
  { localDB }
) => {
  try {
    const observationImages: Array<ObservationImage> = await localDB.getEntities<ObservationImage>(
      EntityType.ObservationImage,
    );
    dispatch(addFetchedObservationImages(observationImages));
  } catch (e) {
    console.log({ e });
  }
};

export const submitNewObservation: Thunk<NewObservationPayload> = (
  newObservationPayload
) => async (dispatch, getState, { api, localDB, navigation }) => {
  try {
    const campaignId: string | undefined = getState().campaigns
      .selectedCampaignEntry?.id;

    const creatorId: string | undefined = getState().account.user?.id;
    if (creatorId === undefined) return;

    const newObservationId: string = generateUUIDv4();
    const newMeasurements: Array<Measurement> = newObservationPayload.measurements.map(
      (measurementPayload) => {
        const measurementId: string = generateUUIDv4();
        return {
          id: measurementId,
          creatorId: creatorId,
          creatorApp: CreatorApps.DATA_COLLECTION_APP,
          createdAt: undefined,
          updatedAt: undefined,
          isDeleted: false,
          deletedAt: undefined,

          observationId: newObservationId,
          litterTypeId: measurementPayload.litterType.id,
          /*
          imageUrl: measurementPayload.imageUrl,
          image: measurementPayload.imageUrl
            ? {
                id: generateUUIDv4(),
                creatorId: creatorId,
                creatorApp: CreatorApps.DATA_COLLECTION_APP,
                featureId: featureId,
                url: measurementPayload.imageUrl,
              }
            : undefined,
          */
          quantity: measurementPayload.quantity,
          quantityUnits: measurementPayload.quantityUnits,
          estimatedWeightKg: measurementPayload.estimatedWeightKg,
          estimatedSizeM2: measurementPayload.estimatedSizeM2,
          estimatedVolumeM3: measurementPayload.estimatedVolumeM3,
          depthM: measurementPayload.depthM,
          isCollected: measurementPayload.isCollected,

          comments: measurementPayload.comments,
        };
      }
    );
    const newObservation: Observation = {
      id: newObservationId,
      creatorId: creatorId,
      creatorApp: CreatorApps.DATA_COLLECTION_APP,
      createdAt: undefined,
      updatedAt: undefined,
      isDeleted: false,
      deletedAt: undefined,

      imageUrl: newObservationPayload.imageUrl,
      image: newObservationPayload.imageUrl
        ? {
            id: generateUUIDv4(),
            creatorId: creatorId,
            creatorApp: CreatorApps.DATA_COLLECTION_APP,
            observationId: newObservationId,
            url: newObservationPayload.imageUrl,
          }
        : undefined,

      campaignId: campaignId || null,
      geometry: newObservationPayload.geometry,
      timestamp: newObservationPayload.timestamp.toISOString(),
      comments: newObservationPayload.comments,
      isMatched: false,
      measurements: newMeasurements,
    };

    const allObservationImages: Array<
      ObservationImage | undefined
    > = [newObservation.image];
    
    await processSubmitObservation(api, localDB, [newObservation]);
    await processSubmitObservationImages(api, localDB, allObservationImages);
    await processSubmitMeasurements(api, localDB, newMeasurements);
    
    dispatch(addNewObservation(newObservation));
    dispatch(resetMeasurementsToAdd());
    dispatch(fetchCachedObservationImages());
    navigation.navigate("observationListScreen");
  } catch (e) {
    console.log(e);
  }
};

export const submitEditObservation: Thunk<EditObservationPayload> = (
  editObservationPayload
) => async (dispatch, getState, { api, localDB, navigation }) => {
  // 1. Patch to backend
  const currentObservation: Observation | undefined = getState().observations
    .selectedObservationEntry;
  if (!currentObservation) return;
  const response = await api.patchObservation(
    currentObservation,
    editObservationPayload
  );

  // 2. Upsert to localDB
  if (!response.ok || !response.data?.result) {
    throw new ActionError("Couldn't sync updated observation.");
  } else {
    // Upsert if success
    const updatedObservation: Observation = {
      ...currentObservation,
      ...editObservationPayload,
    };
    await localDB.upsertEntities(
      [updatedObservation],
      EntityType.Observation,
      true,
      updatedObservation.campaignId
    );

    // 3. Refresh store with new data
    dispatch(addEditedObservation(updatedObservation));
    dispatch(selectObservationDetails(updatedObservation));

    navigation.goBack();
  }
};

export const syncOfflineEntries: Thunk = () => async (
  _dispatch,
  _,
  { api, localDB }
) => {
  try {
    const observations: Array<Observation> = await localDB.getEntities<Observation>(
      EntityType.Observation,
      false
    );
    const measurements: Array<Measurement> = await localDB.getEntities<Measurement>(
      EntityType.Measurement,
      false
    );
    
    const observationImages: Array<ObservationImage> = await localDB.getEntities<ObservationImage>(
      EntityType.ObservationImage,
      false
    );
  
    await processSubmitObservation(api, localDB, observations);
    await processSubmitMeasurements(api, localDB, measurements);
    await processSubmitObservationImages(api, localDB, observationImages);
  } catch (e) {
    console.log(e);
  }
};

export const selectObservationDetails: Thunk<Observation> = (observation) => (
  dispatch
) => {
  dispatch(selectObservation(observation));
  dispatch(resetFeaturePagination());
};

export const processSubmitObservation = async (
  api: any,
  localDB: any,
  observations: Array<Observation>
) => {
  try {
    // 1. Upload observations
    for (let i = 0; i < observations.length; i++) {
      // POST endpoint
      const observation: Observation = observations[i];
      const response = await api.postObservation(observation);

      if (!response.ok || !response.data?.result) {
        // Store offline
        if (response.problem === "cannot-connect" || response.problem === "timeout") {
          await localDB.upsertEntities(
            [observation],
            EntityType.Observation,
            false,
            observation.campaignId
          );
        } else throw new ActionError(`Couldn't post/sync observation: ${response.problem}}`);
      } else {
        // Upsert if success
        const syncedObservation: Observation = response.data?.result;
        await localDB.upsertEntities(
          [syncedObservation],
          EntityType.Observation,
          true,
          observation.campaignId
        );
      }
    }
  } catch (e) {
    console.log(e);
  }
};

export const deleteObservation: Thunk = () => async (
  dispatch,
  getState,
  { api, localDB, navigation }
) => {
  // Delete Observation from backend
  const currentObservation: Observation | undefined = getState().observations
    .selectedObservationEntry;
  if (!currentObservation) return;
  const response = await api.deleteObservation(currentObservation);

  if (!response.ok) {
    throw new ActionError("Couldn't delete observation.");
  } else {
    // If success, delete from localDB
    const observationId: string = currentObservation.id;
    const observationMeasurements: Array<Measurement> = getState().measurements.measurementEntries.filter(
      (f) => f.observationId === observationId
    );
    const measurementIds: Array<string> = observationMeasurements.map((m) => m.id);
    
    const observationImages: Array<ObservationImage> = getState().observations.observationImages.filter(
      (fi) => fi.observationId === observationId
    );
    const observationImageIds: Array<string> = observationImages.map((fi) => fi.id);
    const ids: Array<string> = [
      observationId, 
      ...measurementIds, 
      ...observationImageIds
    ];
    
    if (ids.length > 0) await localDB.deleteEntities(ids);
    
    dispatch(fetchCachedObservations());
    navigation.goBack();
  }
};
