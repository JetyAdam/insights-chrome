import { ScalprumComponent } from '@scalprum/react-core';
import React, { memo, useContext, useEffect } from 'react';
import LoadingFallback from '../../utils/loading-fallback';
import { batch, useDispatch } from 'react-redux';
import { toggleGlobalFilter } from '../../redux/actions';
import ErrorComponent from '../ErrorComponents/DefaultErrorComponent';
import { getPendoConf } from '../../analytics';
import classNames from 'classnames';
import { HelpTopicContext } from '@patternfly/quickstarts';
import GatewayErrorComponent from '../ErrorComponents/GatewayErrorComponent';
import { DeepRequired } from 'utility-types';
import { ChromeUser } from '@redhat-cloud-services/types';
import ChromeAuthContext from '../../auth/ChromeAuthContext';
import { useAtomValue, useSetAtom } from 'jotai';
import { activeModuleAtom } from '../../state/atoms/activeModuleAtom';
import { gatewayErrorAtom } from '../../state/atoms/gatewayErrorAtom';
import { isPreviewAtom } from '../../state/atoms/releaseAtom';

export type ChromeRouteProps = {
  scope: string;
  module: string;
  path: string;
  exact?: boolean;
  scopeClass?: string;
  props?: any;
};

// eslint-disable-next-line react/display-name
const ChromeRoute = memo(
  ({ scope, module, scopeClass, path, props }: ChromeRouteProps) => {
    const isPreview = useAtomValue(isPreviewAtom);
    const dispatch = useDispatch();
    const { setActiveHelpTopicByName } = useContext(HelpTopicContext);
    const { user } = useContext(ChromeAuthContext);
    const gatewayError = useAtomValue(gatewayErrorAtom);

    const setActiveModule = useSetAtom(activeModuleAtom);

    useEffect(() => {
      batch(() => {
        // Only trigger update on a first application render before any active module has been selected
        // should be triggered only once per session
        setActiveModule(scope);
      });
      /**
       * update pendo metadata on application change
       */
      if (window.pendo) {
        try {
          window.pendo.updateOptions(getPendoConf(user as DeepRequired<ChromeUser>, isPreview));
        } catch (error) {
          console.error('Unable to update pendo options');
          console.error(error);
        }
      }

      /**
       * TODO: Discuss default close feature of topics
       * Topics drawer has no close button, therefore there might be an issue with opened topics after user changes route and does not clear the active topic trough the now non existing elements.
       */
      setActiveHelpTopicByName && setActiveHelpTopicByName('');

      return () => {
        /**
         * Reset global filter when switching application
         */
        dispatch(toggleGlobalFilter(false));
      };
    }, [scope]);

    if (gatewayError) {
      return <GatewayErrorComponent error={gatewayError} />;
    }
    return (
      <div className={classNames(scopeClass, scope)}>
        <ScalprumComponent
          // TODO: fix in scalprum. The async loader is no triggered when module/scope changes. We had to abuse the key
          key={`${path}-${isPreview}`}
          ErrorComponent={<ErrorComponent />}
          fallback={LoadingFallback}
          // LoadingFallback={() => LoadingFallback}
          scope={scope}
          module={module}
          appId={scope}
          {...props}
        />
      </div>
    );
  },
  // prevent unnecessary re-render that can trigger initialization phase of a module
  (prevProps, nextProps) =>
    prevProps.scope === nextProps.scope &&
    prevProps.module === nextProps.module &&
    prevProps.scopeClass === nextProps.scopeClass &&
    prevProps.path === nextProps.path
);

export default ChromeRoute;
