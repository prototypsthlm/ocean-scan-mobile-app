import React, { useState } from "react";
import { InputField } from "../InputField";
import { Switch } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import styled from "../../styled";
import { RootState, useThunkDispatch } from "../../store/store";

import { NavigationProps } from "../../navigation/types";
import {
  NewMeasurementPayload,
  addNewMeasurement,
} from "../../store/slices/measurements";
import { theme } from "../../theme";
import { Text } from "../elements";
import { units } from "./utils";
import { Material, UnitEnum } from "../../models";
import {
  VisualInspectionInputField,
  VisualInspectionDropdownField,
} from "./VisualInspectionFields";
import { useSelector } from "react-redux";

interface InitialFormValuesShape {
  [key: string]: string | boolean | undefined;
  quantity?: string;
  unit?: string;
  isApproximate: boolean;
  isCollected: boolean;
  material?: string;
}

const InitialFormValues: InitialFormValuesShape = {
  isApproximate: true,
  isCollected: false,
};

const numberValidation = () =>
  Yup.number()
    .transform((_, value) => {
      return +value.replace(/,/, ".");
    })
    .typeError("Input a number")
    .positive("Input a positive number");

const validation = Yup.object().shape({
  quantity: numberValidation(),
  unit: Yup.string(),
  isApproximate: Yup.boolean(),
  isCollected: Yup.boolean(),
  material: Yup.string().nullable(),
});

const NewMeasurementForm = ({ navigation }: NavigationProps) => {
  const dispatch = useThunkDispatch();

  const handleFormSubmit = (values: any, actions: any) => {
    if (!selectedUnit) return;
    const newMeasurement: NewMeasurementPayload = {
      quantity: Number(values.quantity?.replace(/,/, ".")),
      unit: selectedUnit,
      isApproximate: values.isApproximate,
      isCollected: values.isCollected,
      material: selectedMaterial !== "undefined" ? selectedMaterial : undefined,
    };
    dispatch(addNewMeasurement(newMeasurement));
    actions.resetForm(InitialFormValues);
  };

  const [selectedUnit, setSelectedUnit] = useState<string | null>(
    UnitEnum.PERCENT_OF_SURFACE
  );
  const [selectedMaterial, setSelectedMaterial] = useState<string | undefined>(
    undefined
  );

  const materials = useSelector<RootState, Array<Material>>(
    (state) => state.measurements.materials
  );

  return (
    <Formik
      initialValues={InitialFormValues}
      onSubmit={handleFormSubmit}
      validationSchema={validation}
    >
      {({
        handleBlur,
        handleChange,
        handleSubmit,
        setFieldValue,
        values,
        errors,
        touched,
      }) => (
        <>
          <FormSection style={{ paddingHorizontal: 0 }}>
            <VisualInspectionDropdownField
              label="Units"
              items={units}
              setValue={setSelectedUnit}
            />

            <VisualInspectionInputField
              label="Value"
              unit=""
              value={values.quantity as string}
              onChange={(value) => setFieldValue("quantity", value)}
            />
          </FormSection>

          <ListItemNonTouchable>
            <Text>Is Approximate</Text>
            <Switch
              trackColor={{
                false: "#767577",
                true: theme.color.palette.curiousBlue,
              }}
              onValueChange={(value) => setFieldValue("isApproximate", value)}
              value={values.isApproximate}
            />
          </ListItemNonTouchable>

          <ListItemNonTouchable>
            <Text>Is collected</Text>
            <Switch
              trackColor={{
                false: "#767577",
                true: theme.color.palette.curiousBlue,
              }}
              onValueChange={(value) => setFieldValue("isCollected", value)}
              value={values.isCollected}
            />
          </ListItemNonTouchable>

          <FormSection style={{ paddingHorizontal: 0 }}>
            <VisualInspectionDropdownField
              label="Litter Material"
              items={[
                { label: "Unspecified", value: "undefined" },
                ...materials.map((material) => ({
                  label: material,
                  value: material,
                })),
              ]}
              setValue={setSelectedMaterial}
            />
          </FormSection>

          <SaveButton
            disabled={!values.quantity}
            title="Save"
            onPress={handleSubmit as any}
          />
        </>
      )}
    </Formik>
  );
};

const SaveButton = styled.Button`
  margin-top: ${(props) => props.theme.spacing.xxlarge}px;
`;

const FormSection = styled.View`
  justify-content: center;
  padding-horizontal: ${(props) => props.theme.spacing.medium}px;
  width: 100%;
  padding-top: ${(props) => props.theme.spacing.small}px;
  background-color: ${(props) => props.theme.color.background};
  margin-bottom: 1px;
`;

const ListItemNonTouchable = styled.View`
  background-color: ${(p) => p.theme.color.background};
  border-bottom-color: ${(p) => p.theme.color.palette.gray};
  margin-bottom: 1px;
  padding: ${(props) => props.theme.spacing.small}px
    ${(props) => props.theme.spacing.medium}px;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  justify-content: space-between;
`;

export default NewMeasurementForm;
