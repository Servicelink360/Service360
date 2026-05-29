import React from 'react';
import { Link } from 'react-router-dom';
import Image from '@app/assets/images/rob.png'; 
import FiveZeroZeroStyleWrapper from './NoPermission.styles';
import { useIntl } from "react-intl";

export default function () {
  const intl = useIntl();
  return (
    <FiveZeroZeroStyleWrapper className="iso500Page">
      <div className="iso500Content">
        <h1>  
          {intl.formatMessage({ id: "page.noPermission" })}
        </h1>
        <h3>
          {intl.formatMessage({ id: "page.noPermission.subTitle" })}
        </h3>
        <p>
          {intl.formatMessage({ id: "page.noPermission.description" })}
        </p>
        <div className="groupbtn">
          {/* <Link to="/signin" style={{ marginRight: 10 }}>
            <button type="button">
              {intl.formatMessage({ id: "sidebar.signin.login" })}
            </button>
          </Link> */}
          <Link to="/dashboard">
            <button type="button">
              {intl.formatMessage({ id: "page500.backButton" })}
            </button>
          </Link>
        </div>
      </div>

      <div className="iso500Artwork">
        <img alt="#" src={Image} />
      </div>
    </FiveZeroZeroStyleWrapper>
  );
}
