import React from 'react';
import { bool, func, object, string } from 'prop-types';
import classNames from 'classnames';

// Import util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { EXTENDED_DATA_SCHEMA_TYPES, LISTING_STATE_DRAFT } from '../../../../util/types';
import { getSupportedProcessesInfo, isBookingProcess } from '../../../../util/transaction';

// Import shared components
import { ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingDetailsForm from './EditListingDetailsForm';
import css from './EditListingDetailsPanel.module.css';

/**
 * Pick extended data fields from given data. Picking is based on extended data configuration
 * for the listing and target scopa and transaction process alias.
 *
 * With 'clearCustomFields' parameter can be used to clear unused values for sdk.listings.update call.
 * It returns null for those fields that are managed by configuration, but don't match target process alias.
 *
 * @param {Object} data values to look through against marketplace-custom-config
 * @param {String} targetScope Check that the scope of extended data the config matches
 * @param {String} targetProcessAlias Check that the extended data is relevant for this process alias.
 * @param {boolean} clearCustomFields If true, returns also custom extended data fields with null values
 */
const pickCustomExtendedDataFields = (
  data,
  targetScope,
  targetProcessAlias,
  extendedDataConfigs,
  clearCustomFields = false
) => {
  return extendedDataConfigs.reduce((fields, extendedDataConfig) => {
    const { key, includeForProcessAliases = [], scope = 'public', schemaType } =
      extendedDataConfig || {};

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isTargetScope = scope === targetScope;
    const isTargetProcessAlias = includeForProcessAliases.includes(targetProcessAlias);

    if (isKnownSchemaType && isTargetScope && isTargetProcessAlias) {
      const fieldValue = data[key] || null;
      return { ...fields, [key]: fieldValue };
    } else if (clearCustomFields && isKnownSchemaType && isTargetScope && !isTargetProcessAlias) {
      return { ...fields, [key]: null };
    }
    return fields;
  }, {});
};

const PanelTitle = props => {
  const { listing, state } = props;
  const isPublished = listing?.id && state !== LISTING_STATE_DRAFT;

  return isPublished ? (
    <FormattedMessage
      id="EditListingDetailsPanel.title"
      values={{ listingTitle: <ListingLink listing={listing} /> }}
    />
  ) : (
    <FormattedMessage id="EditListingDetailsPanel.createListingTitle" />
  );
};

const EditListingDetailsPanel = props => {
  const {
    className,
    rootClassName,
    listing,
    disabled,
    ready,
    onSubmit,
    onProcessChange,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    config,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const { description, title, publicData, privateData, state } = listing?.attributes || {};
  const listingExtendedDataConfig = config.listing.listingExtendedData;

  const activeProcesses = config.transaction.processes;
  const supportedProcessesInfo = getSupportedProcessesInfo();
  const activeProcessInfos = supportedProcessesInfo.filter(processInfo =>
    activeProcesses.includes(processInfo.name)
  );

  // If transaction process alias has been set, we won't allow change to it.
  // It's possible to make it editable, but it becomes somewhat complex to modify following panels,
  // according to process that's changed on this initial panel of EditListingWizard.
  // (E.g. adjusting stock vs booking availability settings,
  // if process has been changed for existing listing.)
  const hasSetProcessAlias = !!publicData?.transactionProcessAlias;

  const initialValues = (title, description, publicData, privateData) => {
    const { transactionProcessAlias, unitType } = publicData;

    const getProcessAliasAndUnitType = (processInfos, existingProcessAlias, existingUnitType) => {
      if (existingProcessAlias) {
        return { transactionProcessAlias: existingProcessAlias, unitType: existingUnitType };
      } else if (processInfos.length === 1) {
        const { name, alias, unitTypes } = processInfos[0];
        const singleUnitTypeMaybe = unitTypes.length === 1 ? unitTypes[0] : null;
        return {
          transactionProcessAlias: existingProcessAlias || `${name}/${alias}`,
          unitType: existingUnitType || singleUnitTypeMaybe,
        };
      }
      // If there's neither existing tx process alias nor clear single choice,
      // then user needs to pick them through UI.
      return {};
    };
    return {
      title,
      description,
      ...getProcessAliasAndUnitType(activeProcessInfos, transactionProcessAlias, unitType),
      ...pickCustomExtendedDataFields(
        publicData,
        'public',
        transactionProcessAlias,
        listingExtendedDataConfig
      ),
      ...pickCustomExtendedDataFields(
        privateData,
        'private',
        transactionProcessAlias,
        listingExtendedDataConfig
      ),
    };
  };

  // If listing represents a product instead of a booking, we set availability-plan to seats=0
  const setNoAvailabilityForProductListings = transactionProcessAlias => {
    return isBookingProcess(transactionProcessAlias)
      ? {}
      : {
          availabilityPlan: {
            type: 'availability-plan/time',
            timezone: 'Etc/UTC',
            entries: [
              { dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', seats: 0 },
              { dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', seats: 0 },
            ],
          },
        };
  };

  return (
    <div className={classes}>
      <h1 className={css.title}>
        <PanelTitle listing={listing} state={state} />
      </h1>
      <EditListingDetailsForm
        className={css.form}
        initialValues={initialValues(title, description, publicData, privateData)}
        saveActionMsg={submitButtonText}
        onSubmit={values => {
          const { title, description, transactionProcessAlias, unitType, ...rest } = values;
          const updateValues = {
            title: title.trim(),
            description,
            publicData: {
              transactionProcessAlias,
              unitType,
              ...pickCustomExtendedDataFields(
                rest,
                'public',
                transactionProcessAlias,
                listingExtendedDataConfig,
                true
              ),
            },
            privateData: pickCustomExtendedDataFields(
              rest,
              'private',
              transactionProcessAlias,
              listingExtendedDataConfig,
              true
            ),
            ...setNoAvailabilityForProductListings(transactionProcessAlias),
          };

          onSubmit(updateValues);
        }}
        processInfos={activeProcessInfos}
        hasSetProcessAlias={hasSetProcessAlias}
        onProcessChange={onProcessChange}
        listingExtendedDataConfig={listingExtendedDataConfig}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        autoFocus
      />
    </div>
  );
};

EditListingDetailsPanel.defaultProps = {
  className: null,
  rootClassName: null,
  onProcessChange: null,
  errors: null,
  listing: null,
};

EditListingDetailsPanel.propTypes = {
  className: string,
  rootClassName: string,

  // We cannot use propTypes.listing since the listing might be a draft.
  listing: object,

  disabled: bool.isRequired,
  ready: bool.isRequired,
  onSubmit: func.isRequired,
  onProcessChange: func,
  submitButtonText: string.isRequired,
  panelUpdated: bool.isRequired,
  updateInProgress: bool.isRequired,
  errors: object.isRequired,
};

export default EditListingDetailsPanel;
