import IntlMessages from '@app/components/utility/intlMessages'
import authAction from '@app/redux/auth/actions'
import { Popover } from 'antd'
import React from "react";
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import TopbarDropdownWrapper from './TopbarDropdown.styles'
const { logout } = authAction
interface IProps {
	user: any
	userPhoto: string
	rows: any
	topbarDark?: boolean
}

export default function TopbarUser({ user, userPhoto, rows, topbarDark }: IProps) {
	const [open, setOpen] = React.useState(false)
	const dispatch = useDispatch()
	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen)
	}
	let name = user && user?.fullName ? `${user?.fullName}` : `${user?.username}`
	const settingsRaw = localStorage.getItem('settings');
	let settings = null;
	if (settingsRaw && +user.type===3) {
		settings = JSON.parse(settingsRaw)
		name = settings.find(c => c.settingKey === "COMPANY_NAME")?.settingValue
	}

	const content = (
		<TopbarDropdownWrapper
			className={`isoUserDropdown${topbarDark ? ' isoUserDropdown--dark' : ''}`}
		>
			<a className="isoDropdownLink userWrapper" href="# ">
				<h4 style={{
					maxWidth: ' 100%',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis'
				}}>{user && user?.fullName ? `${user?.fullName}` : `${user?.username}`}</h4>
			</a>
			<Link className="isoDropdownLink" to={'/my-profile'} onClick={() => setOpen(false)}>
				<IntlMessages id="topbar.myprofile" />
			</Link>
			<div className="isoDropdownLink" onClick={() => dispatch(logout())}>
				<IntlMessages id="topbar.logout" />
			</div>
		</TopbarDropdownWrapper >
	)

	return (
		<div className="usernameWrapper"   >

			<div className="usernameWrapper__parent">
			</div>
			<div className="information">
				<Popover
					content={content}
					trigger="click"
					open={open}
					onOpenChange={handleOpenChange}
					arrowPointAtCenter={true}
					placement="bottomLeft"
					overlayClassName={
						topbarDark ? 'topbar-user-popover topbar-user-popover--dark' : 'topbar-user-popover'
					}
				>
					<div>
						<h5
							className="username"
							title={name}
							style={topbarDark ? { color: '#ffffff' } : undefined}
						>
							{name}
						</h5>
					</div>
				</Popover>
			</div>

		</div>
	)
}
