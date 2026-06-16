import React, { useEffect } from 'react';
import {
  DEFAULT_HOME_DESCRIPTION,
  DEFAULT_HOME_TITLE,
  applyMarketingSeo,
} from './marketingSeo';

type Props = {
  path: string;
  title?: string;
  description?: string;
  isHome?: boolean;
};

export default function MarketingSeo({ path, title, description, isHome }: Props) {
  useEffect(() => {
    applyMarketingSeo({
      path,
      title: title || (isHome ? DEFAULT_HOME_TITLE : 'Service360'),
      description: description || DEFAULT_HOME_DESCRIPTION,
      isHome,
    });
  }, [path, title, description, isHome]);

  return null;
}
